import bcrypt from "bcryptjs";
import { Organization, Branch, User } from "@/models";

let seedingPromise: Promise<void> | null = null;

export async function ensureDemoData() {
  if (seedingPromise) return seedingPromise;
  seedingPromise = (async () => {
    try {
      const userCount = await User.countDocuments();
      if (userCount > 0) return;

      console.log("[db] No users found, seeding default demo users...");
      let org = await Organization.findOne();
      if (!org) {
        org = await Organization.create({
          name: "AI Solution IT School",
          slug: "ai-solution-it",
          email: "info@aisolutionit.edu",
          currency: "PKR",
          locale: "en-PK",
          country: "Pakistan",
        });
      }

      let branch = await Branch.findOne({ organizationId: org._id });
      if (!branch) {
        branch = await Branch.create({
          organizationId: org._id,
          name: "Main Campus",
          code: "MAIN",
          isMain: true,
          city: "Lahore",
        });
      }

      const passwordHash = await bcrypt.hash("Admin@123", 10);
      const demoUsers = [
        {
          name: "Aamir Sattar",
          email: "superadmin@school.edu",
          role: "super_admin",
          branchId: null,
        },
        {
          name: "School Administrator",
          email: "admin@school.edu",
          role: "school_admin",
          branchId: branch._id,
        },
        {
          name: "Dr. Sarah Ahmed",
          email: "principal@school.edu",
          role: "principal",
          branchId: branch._id,
        },
        {
          name: "Tariq Mahmood",
          email: "teacher@school.edu",
          role: "teacher",
          branchId: branch._id,
        },
        {
          name: "Usman Ghani",
          email: "accountant@school.edu",
          role: "accountant",
          branchId: branch._id,
        },
        {
          name: "Muhammad Bilal",
          email: "parent@school.edu",
          role: "parent",
          branchId: branch._id,
        },
        {
          name: "Hamza Bilal",
          email: "student@school.edu",
          role: "student",
          branchId: branch._id,
        },
      ];

      for (const u of demoUsers) {
        await User.create({
          organizationId: org._id,
          passwordHash,
          status: "active",
          ...u,
        });
      }

      console.log("[db] Demo users ready (Password: Admin@123 for all).");
    } catch (e: any) {
      console.warn("[db] Demo seed check notice:", e?.message);
    }
  })();

  return seedingPromise;
}
