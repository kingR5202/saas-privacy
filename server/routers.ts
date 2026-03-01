import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import {
  getProfilesByUserId,
  getProfileByUsername,
  createProfile,
  updateProfile,
  deleteProfile,
  getContentByProfileId,
  getSubscriptionsByProfileId,
  getTransactionsByProfileId,
  createWallet,
  getSubscriptionPlansByProfileId,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getAllProfiles,
  getAllTransactions,
  createTransaction,
} from "./db";
import { getGateway, getAvailableGateways, type GatewayName } from "./payments";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  profiles: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getProfilesByUserId(ctx.user.id);
    }),
    getByUsername: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "string") return val;
        throw new Error("Invalid input");
      })
      .query(async ({ input }) => {
        return getProfileByUsername(input);
      }),
    create: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "username" in val && "displayName" in val) {
          return val as { username: string; displayName: string; bio?: string };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ ctx, input }) => {
        const result = await createProfile({
          userId: ctx.user.id,
          username: input.username,
          displayName: input.displayName,
          bio: input.bio,
        });
        const profileId = (result as any).insertId;
        await createWallet({
          profileId,
        });
        return { success: true, profileId };
      }),
    update: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "profileId" in val) {
          return val as { profileId: number; displayName?: string; username?: string; bio?: string; profilePicUrl?: string; bannerUrl?: string };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ input }) => {
        const { profileId, ...data } = input;
        await updateProfile(profileId, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "number") return val;
        throw new Error("Invalid input");
      })
      .mutation(async ({ input }) => {
        await deleteProfile(input);
        return { success: true };
      }),
  }),

  subscriptionPlans: router({
    getByProfile: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "number") return val;
        throw new Error("Invalid input");
      })
      .query(async ({ input }) => {
        return getSubscriptionPlansByProfileId(input);
      }),
    create: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "profileId" in val && "name" in val && "priceInCents" in val) {
          return val as { profileId: number; name: string; description?: string; priceInCents: number; billingCycle?: "monthly" | "quarterly" | "yearly" | "lifetime" };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ input }) => {
        const result = await createSubscriptionPlan({
          profileId: input.profileId,
          name: input.name,
          description: input.description,
          priceInCents: input.priceInCents,
          billingCycle: input.billingCycle || "monthly",
        });
        return { success: true, planId: (result as any).insertId };
      }),
    update: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "planId" in val) {
          return val as { planId: number; name?: string; description?: string; priceInCents?: number; billingCycle?: "monthly" | "quarterly" | "yearly" | "lifetime"; isActive?: boolean };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ input }) => {
        const { planId, ...data } = input;
        await updateSubscriptionPlan(planId, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "number") return val;
        throw new Error("Invalid input");
      })
      .mutation(async ({ input }) => {
        await deleteSubscriptionPlan(input);
        return { success: true };
      }),
  }),

  content: router({
    getByProfile: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "number") return val;
        throw new Error("Invalid input");
      })
      .query(async ({ input }) => {
        return getContentByProfileId(input);
      }),
  }),

  subscriptions: router({
    getByProfile: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "number") return val;
        throw new Error("Invalid input");
      })
      .query(async ({ input }) => {
        return getSubscriptionsByProfileId(input);
      }),
  }),

  transactions: router({
    getByProfile: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "number") return val;
        throw new Error("Invalid input");
      })
      .query(async ({ input }) => {
        return getTransactionsByProfileId(input);
      }),
  }),

  payments: router({
    availableGateways: publicProcedure.query(() => {
      return getAvailableGateways();
    }),
    createCharge: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "gateway" in val && "amountCents" in val && "profileId" in val) {
          return val as { gateway: GatewayName; amountCents: number; profileId: number; planId?: number };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ input }) => {
        const gw = getGateway(input.gateway);
        const charge = await gw.createPixCharge(input.amountCents, {
          profileId: input.profileId,
          planId: input.planId,
        });

        // Record the transaction
        await createTransaction({
          profileId: input.profileId,
          subscriberId: 0, // anonymous/public purchase
          amountInCents: input.amountCents,
          platformFeeInCents: Math.round(input.amountCents * 0.2), // 20% platform fee
          creatorEarningsInCents: Math.round(input.amountCents * 0.8),
          status: "pending",
          paymentGateway: input.gateway,
          externalTransactionId: charge.id,
        });

        return charge;
      }),
    checkStatus: publicProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "gateway" in val && "transactionId" in val) {
          return val as { gateway: GatewayName; transactionId: string };
        }
        throw new Error("Invalid input");
      })
      .query(async ({ input }) => {
        const gw = getGateway(input.gateway);
        return gw.checkTransactionStatus(input.transactionId);
      }),
  }),

  admin: router({
    allProfiles: protectedProcedure.query(async () => {
      return getAllProfiles();
    }),
    allTransactions: protectedProcedure.query(async () => {
      return getAllTransactions();
    }),
    platformStats: protectedProcedure.query(async () => {
      const allTx = await getAllTransactions();
      const allProfilesList = await getAllProfiles();
      const totalRevenue = allTx.reduce((sum, tx) => sum + (tx.amountInCents || 0), 0);
      const platformFee = allTx.reduce((sum, tx) => sum + (tx.platformFeeInCents || 0), 0);
      const completedTx = allTx.filter(tx => tx.status === "completed");

      return {
        totalRevenue,
        platformFee,
        creatorEarnings: totalRevenue - platformFee,
        totalTransactions: allTx.length,
        completedTransactions: completedTx.length,
        activeCreators: allProfilesList.filter(p => p.isActive).length,
        totalProfiles: allProfilesList.length,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
