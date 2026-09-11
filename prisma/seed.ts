import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting seed...");

  const adminEmail = "ecortez@rosbana.com";
  const adminPassword = "admin123";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: "Eduardo Cortez",
        role: "ADMIN",
      },
    });

    console.log(`Admin user created: ${admin.email}`);
  } else {
    console.log(`Admin user already exists: ${existingAdmin.email}`);
  }

  const sampleProject = await prisma.project.findUnique({
    where: { abbreviation: "WEB" },
  });

  if (!sampleProject) {
    const project = await prisma.project.create({
      data: {
        name: "Sistema Web Principal",
        abbreviation: "WEB",
        repoUrl: "https://github.com/example/web",
        environments: {
          create: [
            { name: "Desarrollo", url: "https://dev.example.com", type: "DEV" },
            { name: "Staging", url: "https://staging.example.com", type: "STAGING" },
            { name: "Producción", url: "https://example.com", type: "PROD" },
          ],
        },
      },
    });

    console.log(`Sample project created: ${project.name}`);
  } else {
    console.log(`Sample project already exists: ${sampleProject.name}`);
  }

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
