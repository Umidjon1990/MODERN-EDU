import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import {
  assignments,
  classMembers,
  media,
  submissionAttachments,
  submissions,
  users,
  type Assignment,
  type Database,
  type Submission,
} from '@modern-edu/db';
import type {
  AccessTokenClaims,
  AssignmentDto,
  CreateAssignment,
  GradeInput,
  SubmissionDto,
  SubmitWork,
} from '@modern-edu/contracts';
import { DRIZZLE } from '../db/db.module.js';
import { AuditService } from '../common/audit.service.js';
import { MembershipService } from '../classes/membership.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

function toSubmissionDto(s: Submission, studentName?: string): SubmissionDto {
  return {
    id: s.id,
    assignmentId: s.assignmentId,
    studentId: s.studentId,
    ...(studentName ? { studentName } : {}),
    body: s.body,
    status: s.status,
    submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null,
    grade: s.grade,
    feedback: s.feedback,
    gradedAt: s.gradedAt ? s.gradedAt.toISOString() : null,
  };
}

function toAssignmentDto(a: Assignment): AssignmentDto {
  return {
    id: a.id,
    classId: a.classId,
    title: a.title,
    instructions: a.instructions,
    dueAt: a.dueAt ? a.dueAt.toISOString() : null,
    pointsPossible: a.pointsPossible,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
  };
}

@Injectable()
export class AssignmentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly membership: MembershipService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(
    actor: AccessTokenClaims,
    classId: string,
    dto: CreateAssignment,
  ): Promise<AssignmentDto> {
    await this.membership.requireTeacher(actor.sub, classId);
    const [row] = await this.db
      .insert(assignments)
      .values({
        classId,
        orgId: actor.orgId,
        createdById: actor.sub,
        title: dto.title,
        instructions: dto.instructions ?? null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        pointsPossible: dto.pointsPossible,
        status: 'published',
      })
      .returning();
    await this.audit.log({
      orgId: actor.orgId,
      actorId: actor.sub,
      action: 'assignment.create',
      targetType: 'assignment',
      targetId: row!.id,
    });

    // O'quvchilarga bildirishnoma
    const students = await this.db
      .select({ userId: classMembers.userId })
      .from(classMembers)
      .where(
        and(
          eq(classMembers.classId, classId),
          eq(classMembers.roleInClass, 'student'),
          isNull(classMembers.removedAt),
        ),
      );
    await this.notifications.createMany(
      students.map((s) => s.userId),
      { orgId: actor.orgId, type: 'assignment', title: 'Yangi vazifa', body: dto.title, classId },
    );

    return toAssignmentDto(row!);
  }

  async listForClass(actor: AccessTokenClaims, classId: string): Promise<AssignmentDto[]> {
    const member = await this.membership.requireMembership(actor.sub, classId);
    const rows = await this.db
      .select()
      .from(assignments)
      .where(eq(assignments.classId, classId))
      .orderBy(desc(assignments.createdAt));

    const isTeacher = member.roleInClass !== 'student';
    const dtos: AssignmentDto[] = [];
    for (const a of rows) {
      const dto = toAssignmentDto(a);
      if (isTeacher) {
        const subs = await this.db
          .select({ id: submissions.id })
          .from(submissions)
          .where(eq(submissions.assignmentId, a.id));
        dto.submissionCount = subs.length;
      } else {
        const [mine] = await this.db
          .select()
          .from(submissions)
          .where(and(eq(submissions.assignmentId, a.id), eq(submissions.studentId, actor.sub)))
          .limit(1);
        dto.mySubmission = mine ? toSubmissionDto(mine) : null;
      }
      dtos.push(dto);
    }
    return dtos;
  }

  async submit(
    actor: AccessTokenClaims,
    assignmentId: string,
    dto: SubmitWork,
  ): Promise<SubmissionDto> {
    const assignment = await this.loadAssignment(assignmentId);
    await this.membership.requireMembership(actor.sub, assignment.classId);

    if (dto.mediaIds && dto.mediaIds.length > 0) {
      const mediaRows = await this.db
        .select({ id: media.id })
        .from(media)
        .where(and(inArray(media.id, dto.mediaIds), eq(media.orgId, actor.orgId)));
      if (mediaRows.length !== dto.mediaIds.length) throw new NotFoundException('Fayl topilmadi');
    }

    const [existing] = await this.db
      .select()
      .from(submissions)
      .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, actor.sub)))
      .limit(1);

    let submission: Submission;
    if (existing) {
      const [updated] = await this.db
        .update(submissions)
        .set({
          body: dto.body ?? null,
          status: existing.gradedAt ? 'resubmitted' : 'submitted',
          submittedAt: new Date(),
        })
        .where(eq(submissions.id, existing.id))
        .returning();
      submission = updated!;
      await this.db
        .delete(submissionAttachments)
        .where(eq(submissionAttachments.submissionId, existing.id));
    } else {
      const [created] = await this.db
        .insert(submissions)
        .values({
          assignmentId,
          studentId: actor.sub,
          body: dto.body ?? null,
          status: 'submitted',
          submittedAt: new Date(),
        })
        .returning();
      submission = created!;
    }

    if (dto.mediaIds && dto.mediaIds.length > 0) {
      await this.db.insert(submissionAttachments).values(
        dto.mediaIds.map((mediaId, position) => ({
          submissionId: submission.id,
          mediaId,
          position,
        })),
      );
    }
    return toSubmissionDto(submission);
  }

  async listSubmissions(actor: AccessTokenClaims, assignmentId: string): Promise<SubmissionDto[]> {
    const assignment = await this.loadAssignment(assignmentId);
    await this.membership.requireTeacher(actor.sub, assignment.classId);
    const rows = await this.db
      .select({ sub: submissions, fullName: users.fullName })
      .from(submissions)
      .innerJoin(users, eq(submissions.studentId, users.id))
      .where(eq(submissions.assignmentId, assignmentId));
    return rows.map((r) => toSubmissionDto(r.sub, r.fullName));
  }

  async grade(
    actor: AccessTokenClaims,
    submissionId: string,
    dto: GradeInput,
  ): Promise<SubmissionDto> {
    const [sub] = await this.db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1);
    if (!sub) throw new NotFoundException('Topshiriq topilmadi');
    const assignment = await this.loadAssignment(sub.assignmentId);
    await this.membership.requireTeacher(actor.sub, assignment.classId);
    if (dto.grade > assignment.pointsPossible) {
      throw new ForbiddenException(`Baho ${assignment.pointsPossible} dan oshmasligi kerak`);
    }

    const [updated] = await this.db
      .update(submissions)
      .set({
        grade: dto.grade,
        feedback: dto.feedback ?? null,
        gradedById: actor.sub,
        gradedAt: new Date(),
        status: 'returned',
      })
      .where(eq(submissions.id, submissionId))
      .returning();
    await this.audit.log({
      orgId: actor.orgId,
      actorId: actor.sub,
      action: 'submission.grade',
      targetType: 'submission',
      targetId: submissionId,
      context: { grade: dto.grade },
    });

    await this.notifications.create({
      userId: sub.studentId,
      orgId: actor.orgId,
      type: 'graded',
      title: 'Ishingiz baholandi',
      body: `${assignment.title}: ${dto.grade}/${assignment.pointsPossible}`,
      classId: assignment.classId,
    });

    return toSubmissionDto(updated!);
  }

  private async loadAssignment(assignmentId: string): Promise<Assignment> {
    const [a] = await this.db
      .select()
      .from(assignments)
      .where(eq(assignments.id, assignmentId))
      .limit(1);
    if (!a) throw new NotFoundException('Vazifa topilmadi');
    return a;
  }
}
