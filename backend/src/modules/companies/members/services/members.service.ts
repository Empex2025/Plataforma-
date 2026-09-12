import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { CreateMemberDto } from '../dto/create-member.dto.js';
import { UpdateMemberDto } from '../dto/update-member.dto.js';
import { MemberResponseDto } from '../dto/member-response.dto.js';
import { UserRole } from '@/generated/prisma/enums.js';
import { PlanAccessService } from '@/modules/plans/services/plan-access.service.js';
import { PlanFeature } from '@/modules/plans/plan.constants.js';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planAccess: PlanAccessService,
  ) {}

  async listMembers(
    companyId: string,
    userId: string,
  ): Promise<MemberResponseDto[]> {
    await this.validateMembership(companyId, userId);

    const memberships = await this.prisma.userCompany.findMany({
      where: { companyId },
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => MemberResponseDto.fromPlain(m));
  }

  async addMember(
    companyId: string,
    requesterId: string,
    dto: CreateMemberDto,
  ): Promise<MemberResponseDto> {
    const requesterMembership = await this.validateMembership(companyId, requesterId);

    if (requesterMembership.role !== UserRole.MERCHANT_OWNER) {
      throw new ForbiddenException('Only company owner can manage members');
    }

    await this.planAccess.assertWithinLimit(companyId, PlanFeature.MAX_MEMBERS);

    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (!targetUser.active) {
      throw new BadRequestException('Cannot add inactive user');
    }

    const existingMembership = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: targetUser.id,
          companyId,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException('User is already a member of this company');
    }

    const membership = await this.prisma.userCompany.create({
      data: {
        userId: targetUser.id,
        companyId,
        role: dto.role,
      },
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
    });

    return MemberResponseDto.fromPlain(membership);
  }

  async updateRole(
    companyId: string,
    requesterId: string,
    targetUserId: string,
    dto: UpdateMemberDto,
  ): Promise<MemberResponseDto> {
    const requesterMembership = await this.validateMembership(companyId, requesterId);

    if (requesterMembership.role !== UserRole.MERCHANT_OWNER) {
      throw new ForbiddenException('Only company owner can manage members');
    }

    const targetMembership = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: targetUserId,
          companyId,
        },
      },
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('Member not found in this company');
    }

    if (targetUserId === requesterId && dto.role !== UserRole.MERCHANT_OWNER) {
      const ownerCount = await this.prisma.userCompany.count({
        where: {
          companyId,
          role: UserRole.MERCHANT_OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot downgrade the last owner');
      }
    }

    const updated = await this.prisma.userCompany.update({
      where: {
        userId_companyId: {
          userId: targetUserId,
          companyId,
        },
      },
      data: { role: dto.role },
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
    });

    return MemberResponseDto.fromPlain(updated);
  }

  async removeMember(
    companyId: string,
    requesterId: string,
    targetUserId: string,
  ): Promise<void> {
    const requesterMembership = await this.validateMembership(companyId, requesterId);

    if (requesterMembership.role !== UserRole.MERCHANT_OWNER) {
      throw new ForbiddenException('Only company owner can manage members');
    }

    const targetMembership = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: targetUserId,
          companyId,
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('Member not found in this company');
    }

    if (targetUserId === requesterId) {
      const ownerCount = await this.prisma.userCompany.count({
        where: {
          companyId,
          role: UserRole.MERCHANT_OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the last owner');
      }
    }

    await this.prisma.userCompany.delete({
      where: {
        userId_companyId: {
          userId: targetUserId,
          companyId,
        },
      },
    });
  }

  private async validateMembership(companyId: string, userId: string) {
    const userCompany = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
    });

    if (!userCompany) {
      throw new ForbiddenException('User does not belong to this company');
    }

    return userCompany;
  }
}

