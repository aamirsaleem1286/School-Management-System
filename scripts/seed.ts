import fs from "node:fs";
import path from "node:path";

function loadEnvFile(file: string) {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) return;
  const content = fs.readFileSync(full, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");
process.env.SKIP_DEMO_SEED = "1";

import mongoose, { beginBatch, flushBatch } from "../src/lib/pgdb";
import bcrypt from "bcryptjs";
import { dbConnect } from "../src/lib/db";
import {
  Organization,
  Branch,
  User,
  Student,
  Guardian,
  Admission,
  AcademicYear,
  SchoolClass,
  Section,
  Subject,
  TeacherAssignment,
  Timetable,
  Homework,
  Attendance,
  LeaveRequest,
  Exam,
  Mark,
  ReportCard,
  FeeStructure,
  Invoice,
  Payment,
  Expense,
  Employee,
  Payroll,
  Announcement,
  Notification,
  Event,
  LibraryBook,
  LibraryTransaction,
  TransportRoute,
  Vehicle,
  Hostel,
  InventoryItem,
  Visitor,
  AuditLog,
  Counter,
  Setting,
} from "../src/models";
import { DEFAULT_GRADING_SCALE, calculateGrade } from "../src/lib/utils";

const RESET = process.argv.includes("--reset");
const PASSWORD = "Admin@123";
const hash = bcrypt.hashSync(PASSWORD, 10);

let seed = 42;
function rand() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function daysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}
function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

const FIRST_NAMES_M = ["Ahmed", "Ali", "Hassan", "Usman", "Bilal", "Hamza", "Zain", "Faizan", "Ayan", "Ibrahim", "Rayyan", "Saad", "Umar", "Talha", "Haris", "Arham", "Danish", "Shahzaib", "Rehan", "Kashif"];
const FIRST_NAMES_F = ["Ayesha", "Fatima", "Zainab", "Hira", "Sana", "Maryam", "Areeba", "Iqra", "Noor", "Amna", "Mahnoor", "Laiba", "Rida", "Aleena", "Eman", "Hafsa", "Khadija", "Anaya", "Zoya", "Mehwish"];
const LAST_NAMES = ["Khan", "Ahmed", "Malik", "Sheikh", "Raza", "Hussain", "Siddiqui", "Qureshi", "Farooq", "Abbas", "Chaudhry", "Butt", "Iqbal", "Javed", "Nawaz", "Sattar"];
const CLASS_NAMES = ["Nursery", "KG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8"];
const SUBJECTS = [
  { name: "English", code: "ENG" },
  { name: "Mathematics", code: "MATH" },
  { name: "Science", code: "SCI" },
  { name: "Urdu", code: "URD" },
  { name: "Islamiat", code: "ISL" },
  { name: "Computer Science", code: "CS" },
  { name: "Social Studies", code: "SST" },
];
const DEPARTMENTS = ["Academics", "Science", "Mathematics", "Languages", "Administration", "Finance", "IT", "Sports"];
const DESIGNATIONS = ["Teacher", "Senior Teacher", "Head of Department", "Lab Assistant", "Administrator", "Accountant", "IT Support"];

function studentName(gender: "male" | "female") {
  return gender === "male" ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
}

async function main() {
  console.log("Connecting to database...");
  await dbConnect();

  if (RESET) {
    console.log("Resetting database...");
    await mongoose.connection.db!.dropDatabase();
  } else {
    const existing = await User.countDocuments();
    if (existing > 0) {
      console.log("Database already seeded. Use `npm run seed:reset` to wipe and reseed.");
      return;
    }
  }

  console.log("Seeding organization & branches...");
  beginBatch();
  const org = await Organization.create({
    name: "AI Solution IT School System",
    slug: "ai-solution-it",
    email: "info@aisolutionit.edu",
    phone: "+92 300 1234567",
    website: "https://aisolutionit.edu",
    address: "12-A, Knowledge Avenue, Gulberg",
    city: "Lahore",
    country: "Pakistan",
    currency: "PKR",
    locale: "en-PK",
    timezone: "Asia/Karachi",
    primaryColor: "#0B1B3A",
    settings: {
      gradingScale: DEFAULT_GRADING_SCALE,
      lateFeePerDay: 100,
      invoicePrefix: "INV",
      receiptPrefix: "RCP",
      admissionPrefix: "ADM",
      employeePrefix: "EMP",
      modules: {
        library: true,
        transport: true,
        hostel: true,
        inventory: true,
        lms: false,
        health: true,
        canteen: false,
        visitors: true,
        alumni: false,
      },
      languages: ["en", "ur", "ms"],
    },
  });
  const orgId = String(org._id);

  const mainBranch = await Branch.create({
    organizationId: orgId,
    name: "Main Campus",
    code: "MAIN",
    address: "12-A, Knowledge Avenue, Gulberg",
    city: "Lahore",
    phone: "+92 42 35712345",
    email: "main@aisolutionit.edu",
    principalName: "Dr. Sarah Ahmed",
    isMain: true,
  });
  const cityBranch = await Branch.create({
    organizationId: orgId,
    name: "City Campus",
    code: "CITY",
    address: "88, Model Town Link Road",
    city: "Lahore",
    phone: "+92 42 35881234",
    email: "city@aisolutionit.edu",
    principalName: "Mr. Imran Sheikh",
  });
  const b1 = String(mainBranch._id);
  const b2 = String(cityBranch._id);

  await Setting.create([
    { organizationId: orgId, branchId: null, key: "app.name", value: "AI Solution IT School ERP" },
    { organizationId: orgId, branchId: null, key: "locale", value: "en-PK" },
  ]);

  console.log("Seeding academic year, classes, sections, subjects...");
  const academicYear = await AcademicYear.create({
    organizationId: orgId,
    name: "2026-2027",
    startDate: new Date("2026-04-01"),
    endDate: new Date("2027-03-31"),
    isCurrent: true,
    terms: [
      { name: "Term 1", startDate: new Date("2026-04-01"), endDate: new Date("2026-09-30") },
      { name: "Term 2", startDate: new Date("2026-10-01"), endDate: new Date("2027-03-31") },
    ],
  });
  const ayId = String(academicYear._id);

  type ClassDoc = { id: string; name: string; branchId: string; sections: { id: string; name: string }[] };
  const classesByBranch: Record<string, ClassDoc[]> = { [b1]: [], [b2]: [] };

  const classNamesB1 = CLASS_NAMES;
  const classNamesB2 = ["Nursery", "KG", "Grade 1", "Grade 2", "Grade 3"];

  for (const [branchId, names] of [
    [b1, classNamesB1],
    [b2, classNamesB2],
  ] as const) {
    for (let i = 0; i < names.length; i++) {
      const cls = await SchoolClass.create({
        organizationId: orgId,
        branchId,
        name: names[i],
        level: i,
        capacity: 45,
      });
      const sectionNames = branchId === b1 ? ["A", "B"] : ["A"];
      const sections: { id: string; name: string }[] = [];
      for (const sname of sectionNames) {
        const sec = await Section.create({
          organizationId: orgId,
          branchId,
          classId: cls._id,
          name: sname,
          capacity: 30,
          room: `${names[i]}-${sname}`,
        });
        sections.push({ id: String(sec._id), name: sname });
      }
      classesByBranch[branchId].push({ id: String(cls._id), name: names[i], branchId, sections });
    }
  }

  const subjects: { id: string; name: string; code: string; classIds: string[] }[] = [];
  for (const [branchId, classes] of Object.entries(classesByBranch)) {
    for (const subj of SUBJECTS) {
      const relevant = classes.filter((c) => {
        if (subj.code === "CS") return c.name !== "Nursery" && c.name !== "KG";
        if (subj.code === "SST") return !["Nursery", "KG"].includes(c.name);
        return true;
      });
      const doc = await Subject.create({
        organizationId: orgId,
        branchId,
        name: subj.name,
        code: subj.code,
        classIds: relevant.map((c) => c.id),
        maxMarks: 100,
      });
      subjects.push({ id: String(doc._id), name: subj.name, code: subj.code, classIds: relevant.map((c) => c.id) });
    }
  }
  const subjectsForClass = (classId: string) =>
    subjects.filter((s) => s.classIds.includes(classId));

  console.log("Seeding users...");
  async function makeUser(data: Record<string, unknown>) {
    return User.create({ organizationId: orgId, passwordHash: hash, status: "active", ...data });
  }

  const superAdmin = await makeUser({
    name: "Aamir Sattar",
    email: "superadmin@school.edu",
    role: "super_admin",
    branchId: null,
    phone: "+92 300 1111111",
  });
  const schoolAdmin = await makeUser({
    name: "Hina Raza",
    email: "admin@school.edu",
    role: "school_admin",
    branchId: b1,
    phone: "+92 300 2222222",
  });
  const cityAdmin = await makeUser({
    name: "Imran Sheikh",
    email: "cityadmin@school.edu",
    role: "school_admin",
    branchId: b2,
    phone: "+92 300 2222333",
  });
  const principal = await makeUser({
    name: "Dr. Sarah Ahmed",
    email: "principal@school.edu",
    role: "principal",
    branchId: b1,
    phone: "+92 300 3333333",
  });
  const vicePrincipal = await makeUser({
    name: "Kamran Abbas",
    email: "vp@school.edu",
    role: "vice_principal",
    branchId: b1,
    phone: "+92 300 3333444",
  });
  const accountant = await makeUser({
    name: "Faiza Noor",
    email: "accountant@school.edu",
    role: "accountant",
    branchId: b1,
    phone: "+92 300 4444444",
  });
  const hrManager = await makeUser({
    name: "Bilal Chaudhry",
    email: "hr@school.edu",
    role: "hr_manager",
    branchId: b1,
    phone: "+92 300 5555555",
  });
  const librarian = await makeUser({
    name: "Nadia Iqbal",
    email: "librarian@school.edu",
    role: "librarian",
    branchId: b1,
    phone: "+92 300 6666666",
  });
  const transportManager = await makeUser({
    name: "Rashid Mehmood",
    email: "transport@school.edu",
    role: "transport_manager",
    branchId: b1,
    phone: "+92 300 7777777",
  });

  console.log("Seeding employees...");
  const teacherUsers: { user: any; employee: any }[] = [];
  const teacherNames = [
    ["Ayesha", "Khan", "female"],
    ["Usman", "Raza", "male"],
    ["Fatima", "Siddiqui", "female"],
    ["Hassan", "Qureshi", "male"],
    ["Maryam", "Farooq", "female"],
    ["Zain", "Malik", "male"],
    ["Hira", "Abbas", "female"],
    ["Talha", "Sheikh", "male"],
  ];
  for (let i = 0; i < teacherNames.length; i++) {
    const [first, last, gender] = teacherNames[i];
    const email = i === 0 ? "teacher@school.edu" : `teacher${i + 1}@school.edu`;
    const user = await makeUser({
      name: `${first} ${last}`,
      email,
      role: "teacher",
      branchId: b1,
      phone: `+92 301 ${String(1000000 + i).slice(-7)}`,
    });
    const employee = await Employee.create({
      organizationId: orgId,
      branchId: b1,
      employeeNo: `EMP-2026-${String(i + 1).padStart(4, "0")}`,
      userId: user._id,
      firstName: first,
      lastName: last,
      designation: i === 0 ? "Senior Teacher" : "Teacher",
      department: pick(DEPARTMENTS.slice(0, 4)),
      qualification: pick(["M.Phil Education", "MSc Mathematics", "MA English", "MSc Physics", "BS Computer Science"]),
      experienceYears: randInt(2, 15),
      joinDate: addMonths(new Date(), -randInt(6, 72)),
      contractType: "permanent",
      gender: gender as "male" | "female",
      phone: user.phone,
      email,
      salary: {
        base: randInt(55, 95) * 1000,
        houseAllowance: 15000,
        transportAllowance: 5000,
        medicalAllowance: 3000,
        taxDeduction: 2500,
        otherDeduction: 0,
      },
    });
    user.employeeId = employee._id;
    await user.save();
    teacherUsers.push({ user, employee });
  }

  const staffDefs = [
    ["Sana", "Javed", "Accountant", "Finance"],
    ["Waqas", "Ali", "Lab Assistant", "Science"],
    ["Sadia", "Hussain", "Administrator", "Administration"],
    ["Noman", "Butt", "IT Support", "IT"],
    ["Rabia", "Nawaz", "Head of Department", "Languages"],
  ];
  for (let i = 0; i < staffDefs.length; i++) {
    const [first, last, designation, department] = staffDefs[i];
    await Employee.create({
      organizationId: orgId,
      branchId: b1,
      employeeNo: `EMP-2026-${String(teacherNames.length + i + 1).padStart(4, "0")}`,
      firstName: first,
      lastName: last,
      designation,
      department,
      qualification: pick(["MBA", "BSc", "MSc", "BBA"]),
      experienceYears: randInt(1, 10),
      joinDate: addMonths(new Date(), -randInt(3, 48)),
      contractType: "permanent",
      gender: i % 2 === 0 ? "female" : "male",
      phone: `+92 302 ${String(2000000 + i).slice(-7)}`,
      email: `staff${i + 1}@school.edu`,
      salary: {
        base: randInt(40, 70) * 1000,
        houseAllowance: 10000,
        transportAllowance: 4000,
        medicalAllowance: 2000,
        taxDeduction: 1500,
      },
    });
  }

  const cityTeacher = await makeUser({
    name: "Saima Tariq",
    email: "cityteacher@school.edu",
    role: "teacher",
    branchId: b2,
    phone: "+92 303 1234567",
  });
  await Employee.create({
    organizationId: orgId,
    branchId: b2,
    employeeNo: "EMP-2026-0100",
    userId: cityTeacher._id,
    firstName: "Saima",
    lastName: "Tariq",
    designation: "Teacher",
    department: "Academics",
    qualification: "MSc",
    experienceYears: 6,
    joinDate: addMonths(new Date(), -24),
    contractType: "permanent",
    gender: "female",
    phone: "+92 303 1234567",
    email: "cityteacher@school.edu",
    salary: { base: 70000, houseAllowance: 12000, transportAllowance: 4000, medicalAllowance: 2000, taxDeduction: 2000 },
  });

  console.log("Seeding teacher assignments & timetables...");
  for (const [branchId, classes] of Object.entries(classesByBranch)) {
    const branchTeachers = branchId === b1 ? teacherUsers : [{ user: cityTeacher }];
    let ti = 0;
    for (const cls of classes) {
      for (const sec of cls.sections) {
        const classSubjects = subjects.filter((s) => s.classIds.includes(cls.id));
        const periods: any[] = [];
        for (let p = 0; p < 6; p++) {
          const subj = classSubjects[p % classSubjects.length];
          const teacher = branchTeachers[(ti + p) % branchTeachers.length].user;
          periods.push({
            period: p + 1,
            startTime: `${8 + p}:00`,
            endTime: `${8 + p}:45`,
            subjectId: subj?.id,
            teacherId: teacher._id,
            room: `${cls.name}-${sec.name}`,
          });
          if (subj) {
            await TeacherAssignment.updateOne(
              { branchId, teacherId: teacher._id, subjectId: subj.id, classId: cls.id, sectionId: sec.id },
              {
                $setOnInsert: {
                  organizationId: orgId,
                  branchId,
                  academicYearId: ayId,
                  teacherId: teacher._id,
                  employeeId: teacher.employeeId,
                  subjectId: subj.id,
                  classId: cls.id,
                  sectionId: sec.id,
                },
              },
              { upsert: true }
            );
          }
        }
        for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]) {
          await Timetable.create({
            organizationId: orgId,
            branchId,
            academicYearId: ayId,
            classId: cls.id,
            sectionId: sec.id,
            dayOfWeek: day,
            periods,
          });
        }
        ti++;
      }
    }
  }

  // Assign class teachers
  for (const cls of classesByBranch[b1]) {
    for (let s = 0; s < cls.sections.length; s++) {
      const teacher = teacherUsers[(cls.name.length + s) % teacherUsers.length].user;
      await Section.updateOne({ _id: cls.sections[s].id }, { classTeacherId: teacher._id });
    }
  }

  console.log("Seeding students...");
  const studentDocs: any[] = [];
  for (const [branchId, classes] of Object.entries(classesByBranch)) {
    let counter = 0;
    for (const cls of classes) {
      for (const sec of cls.sections) {
        const count = branchId === b1 ? 4 : 3;
        for (let i = 0; i < count; i++) {
          counter++;
          const gender: "male" | "female" = rand() > 0.5 ? "male" : "female";
          const first = studentName(gender);
          const last = pick(LAST_NAMES);
          const admissionNo = `${branchId === b1 ? "ADM" : "CTY"}-2026-${String(counter).padStart(4, "0")}`;
          const fatherFirst = pick(FIRST_NAMES_M);
          const doc = await Student.create({
            organizationId: orgId,
            branchId,
            admissionNo,
            rollNo: `${cls.name.replace(/\D/g, "") || "0"}${sec.name}${String(i + 1).padStart(2, "0")}`,
            firstName: first,
            lastName: last,
            gender,
            dob: new Date(2026 - (cls.name.startsWith("Grade") ? Number(cls.name.replace(/\D/g, "")) + 5 : 4), randInt(1, 12), randInt(1, 27)),
            bloodGroup: pick(["A+", "B+", "O+", "AB+", "A-", "O-"]),
            religion: "Islam",
            nationality: "Pakistani",
            classId: cls.id,
            sectionId: sec.id,
            academicYearId: ayId,
            status: "active",
            admissionDate: addMonths(new Date(), -randInt(1, 30)),
            guardian: {
              fatherName: `${fatherFirst} ${last}`,
              motherName: `${studentName("female")} ${last}`,
              guardianName: `${fatherFirst} ${last}`,
              relation: "Father",
              phone: `+92 30${randInt(0, 9)} ${String(randInt(1000000, 9999999))}`,
              email: `${fatherFirst.toLowerCase()}.${last.toLowerCase()}${randInt(1, 99)}@example.com`,
              occupation: pick(["Businessman", "Engineer", "Doctor", "Teacher", "Government Officer", "Shopkeeper"]),
              cnic: `35201-${randInt(1000000, 9999999)}-${randInt(1, 9)}`,
              address: `House ${randInt(1, 200)}, Street ${randInt(1, 40)}, ${pick(["Gulberg", "Model Town", "DHA", "Johar Town", "Cantt"])}, Lahore`,
            },
            emergencyContact: {
              name: `${fatherFirst} ${last}`,
              relation: "Father",
              phone: `+92 30${randInt(0, 9)} ${String(randInt(1000000, 9999999))}`,
            },
            medical: { allergies: "", conditions: "", notes: "" },
            address: `House ${randInt(1, 200)}, ${pick(["Gulberg", "Model Town", "DHA", "Johar Town"])}, Lahore`,
            city: "Lahore",
            discountPercent: rand() > 0.85 ? 10 : 0,
          });
          studentDocs.push(doc);
        }
      }
    }
  }
  console.log(`  ${studentDocs.length} students created`);

  // Guardians
  for (const s of studentDocs.slice(0, 20)) {
    const g = await Guardian.create({
      organizationId: orgId,
      branchId: s.branchId,
      name: s.guardian.guardianName,
      relation: s.guardian.relation,
      phone: s.guardian.phone,
      email: s.guardian.email,
      cnic: s.guardian.cnic,
      occupation: s.guardian.occupation,
      address: s.guardian.address,
      studentIds: [s._id],
    });
    s.guardianUserIds = [];
    void g;
  }

  console.log("Seeding parent & student portal users...");
  const mainStudents = studentDocs.filter((s) => String(s.branchId) === b1);
  const parentUser = await makeUser({
    name: `${mainStudents[0].guardian.guardianName}`,
    email: "parent@school.edu",
    role: "parent",
    branchId: b1,
    phone: mainStudents[0].guardian.phone,
    children: [mainStudents[0]._id, mainStudents[1]._id],
  });
  for (const s of [mainStudents[0], mainStudents[1]]) {
    s.guardianUserIds = [parentUser._id];
    await s.save();
  }
  const parentUser2 = await makeUser({
    name: mainStudents[2].guardian.guardianName,
    email: "parent2@school.edu",
    role: "parent",
    branchId: b1,
    phone: mainStudents[2].guardian.phone,
    children: [mainStudents[2]._id],
  });
  mainStudents[2].guardianUserIds = [parentUser2._id];
  await mainStudents[2].save();

  const studentUser = await makeUser({
    name: `${mainStudents[0].firstName} ${mainStudents[0].lastName}`,
    email: "student@school.edu",
    role: "student",
    branchId: b1,
    phone: "",
    studentId: mainStudents[0]._id,
  });
  mainStudents[0].userId = studentUser._id;
  await mainStudents[0].save();

  console.log("Seeding admissions...");
  for (let i = 0; i < 9; i++) {
    const gender: "male" | "female" = rand() > 0.5 ? "male" : "female";
    const cls = classesByBranch[b1][randInt(0, classesByBranch[b1].length - 1)];
    await Admission.create({
      organizationId: orgId,
      branchId: b1,
      applicationNo: `ADM-APP-2026-${String(i + 1).padStart(4, "0")}`,
      academicYearId: ayId,
      firstName: studentName(gender),
      lastName: pick(LAST_NAMES),
      gender,
      dob: new Date(2015 + randInt(0, 5), randInt(1, 12), randInt(1, 27)),
      classAppliedId: cls.id,
      guardianName: `${pick(FIRST_NAMES_M)} ${pick(LAST_NAMES)}`,
      relation: "Father",
      phone: `+92 30${randInt(0, 9)} ${randInt(1000000, 9999999)}`,
      email: `applicant${i + 1}@example.com`,
      address: `House ${randInt(1, 200)}, ${pick(["Gulberg", "DHA", "Johar Town"])}, Lahore`,
      previousSchool: pick(["Beaconhouse School", "The City School", "Roots Millennium", "LGS", ""]),
      previousPercentage: randInt(55, 95),
      status: pick(["pending", "pending", "under_review", "waitlisted"]),
      source: "online",
    });
  }

  console.log("Seeding attendance (last 20 weekdays)...");
  const attendanceDocs: any[] = [];
  for (let d = 0; d < 30; d++) {
    const date = daysAgo(d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    for (const s of studentDocs) {
      const roll = rand();
      const status = roll > 0.12 ? "present" : roll > 0.07 ? "absent" : roll > 0.03 ? "late" : "leave";
      attendanceDocs.push({
        organizationId: orgId,
        branchId: s.branchId,
        academicYearId: ayId,
        date,
        personType: "student",
        personId: s._id,
        studentId: s._id,
        classId: s.classId,
        sectionId: s.sectionId,
        status,
        markedBy: schoolAdmin._id,
        source: "manual",
      });
    }
  }
  const employees = await Employee.find({ organizationId: orgId }).lean();
  for (let d = 0; d < 10; d++) {
    const date = daysAgo(d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    for (const e of employees) {
      attendanceDocs.push({
        organizationId: orgId,
        branchId: e.branchId,
        academicYearId: ayId,
        date,
        personType: "staff",
        personId: e._id,
        employeeId: e._id,
        status: rand() > 0.05 ? "present" : "leave",
        markedBy: hrManager._id,
        source: "manual",
      });
    }
  }
  await Attendance.insertMany(attendanceDocs, { ordered: false }).catch(() => null);

  console.log("Seeding leave requests...");
  for (let i = 0; i < 6; i++) {
    const s = pick(mainStudents);
    await LeaveRequest.create({
      organizationId: orgId,
      branchId: b1,
      applicantType: "student",
      personId: s._id,
      studentId: s._id,
      fromDate: daysAgo(randInt(1, 15)),
      toDate: daysAgo(randInt(0, 1)),
      type: pick(["medical", "family", "general"]),
      reason: pick(["Fever and flu", "Family emergency", "Attending a wedding", "Medical appointment"]),
      status: pick(["pending", "approved", "rejected"]),
    });
  }
  for (let i = 0; i < 3; i++) {
    const e = pick(employees.filter((x) => String(x.branchId) === b1));
    await LeaveRequest.create({
      organizationId: orgId,
      branchId: b1,
      applicantType: "staff",
      personId: e._id,
      employeeId: e._id,
      fromDate: daysAgo(randInt(2, 20)),
      toDate: daysAgo(randInt(0, 2)),
      type: "casual",
      reason: pick(["Personal reasons", "Medical leave", "Family function"]),
      status: pick(["pending", "approved"]),
    });
  }

  console.log("Seeding fee structures, invoices and payments...");
  const feeStructures: any[] = [];
  for (const [branchId, classes] of Object.entries(classesByBranch)) {
    for (const cls of classes) {
      const level = Number(cls.name.replace(/\D/g, "")) || 0;
      const tuition = 12000 + level * 1500;
      const fs = await FeeStructure.create({
        organizationId: orgId,
        branchId,
        academicYearId: ayId,
        classId: cls.id,
        name: `${cls.name} Monthly Fee Plan`,
        items: [
          { category: "Tuition Fee", amount: tuition, frequency: "monthly" },
          { category: "Examination Fee", amount: 1500, frequency: "term" },
          { category: "Technology Fee", amount: 500, frequency: "monthly" },
        ],
        totalAmount: tuition + 500,
        dueDay: 10,
        lateFeePerDay: 100,
      });
      feeStructures.push(fs);
    }
  }

  const invoiceDocs: any[] = [];
  const paymentDocs: any[] = [];
  const monthNames = ["Sep", "Oct", "Nov"];
  let invSeq = 0;
  let rcpSeq = 0;
  for (const s of studentDocs) {
    const fs = feeStructures.find((f) => String(f.classId) === String(s.classId));
    if (!fs) continue;
    for (let m = 0; m < 3; m++) {
      invSeq++;
      const monthIndex = 8 + m; // Sep=8
      const year = 2026;
      const dueDate = new Date(year, monthIndex, 10);
      const tuition = fs.items.find((i: any) => i.category === "Tuition Fee")?.amount || 12000;
      const tech = 500;
      const subtotal = tuition + tech;
      const discount = Math.round((subtotal * (s.discountPercent || 0)) / 100);
      const total = subtotal - discount;
      const state = rand();
      let paidAmount = 0;
      let status: string = "unpaid";
      if (m < 2) {
        if (state > 0.2) {
          paidAmount = total;
          status = "paid";
        } else if (state > 0.08) {
          paidAmount = Math.round(total / 2);
          status = "partial";
        } else {
          status = dueDate < new Date() ? "overdue" : "unpaid";
        }
      } else {
        if (state > 0.75) {
          paidAmount = total;
          status = "paid";
        } else if (state > 0.6) {
          paidAmount = Math.round(total / 2);
          status = "partial";
        } else {
          status = "unpaid";
        }
      }
      const invoice = await Invoice.create({
        organizationId: orgId,
        branchId: s.branchId,
        invoiceNo: `INV-2026-${String(invSeq).padStart(5, "0")}`,
        studentId: s._id,
        academicYearId: ayId,
        classId: s.classId,
        items: [
          { description: `Tuition Fee - ${monthNames[m]} 2026`, amount: tuition },
          { description: `Technology Fee - ${monthNames[m]} 2026`, amount: tech },
        ],
        subtotal,
        discount,
        fine: 0,
        total,
        paidAmount,
        balance: total - paidAmount,
        dueDate,
        month: `${monthNames[m]} 2026`,
        status,
        createdBy: accountant._id,
      });
      invoiceDocs.push(invoice);
      if (paidAmount > 0) {
        rcpSeq++;
        const payment = await Payment.create({
          organizationId: orgId,
          branchId: s.branchId,
          receiptNo: `RCP-2026-${String(rcpSeq).padStart(5, "0")}`,
          invoiceId: invoice._id,
          studentId: s._id,
          amount: paidAmount,
          method: pick(["cash", "bank_transfer", "online", "card"]),
          reference: `TXN${randInt(100000, 999999)}`,
          paidAt: new Date(year, monthIndex, randInt(1, 20)),
          recordedBy: accountant._id,
        });
        paymentDocs.push(payment);
      }
    }
  }
  await Counter.create([
    { organizationId: orgId, branchId: b1, key: "invoice", seq: invSeq },
    { organizationId: orgId, branchId: b1, key: "receipt", seq: rcpSeq },
    { organizationId: orgId, branchId: b2, key: "invoice", seq: 0 },
    { organizationId: orgId, branchId: b2, key: "receipt", seq: 0 },
  ]);

  console.log("Seeding expenses...");
  const expenseCategories = ["Salaries", "Utilities", "Maintenance", "Stationery", "Transport", "Marketing", "Events"];
  for (let i = 0; i < 24; i++) {
    await Expense.create({
      organizationId: orgId,
      branchId: b1,
      voucherNo: `VCH-2026-${String(i + 1).padStart(4, "0")}`,
      category: pick(expenseCategories),
      description: pick([
        "Monthly electricity bill",
        "Staff salaries payout",
        "Classroom furniture repair",
        "Stationery purchase",
        "School bus fuel",
        "Sports day arrangements",
        "Water dispenser maintenance",
        "Annual function catering",
      ]),
      amount: randInt(15, 450) * 1000,
      date: addMonths(new Date(), -randInt(0, 2)),
      paidTo: pick(["LESCO", "City Supplies", "Al-Noor Traders", "Staff Payroll", "Metro Fuels"]),
      method: pick(["cash", "bank_transfer", "cheque"]),
      recordedBy: accountant._id,
    });
  }

  console.log("Seeding payroll...");
  const now = new Date();
  for (const e of employees.filter((x) => String(x.branchId) === b1)) {
    const sal: any = e.salary || {};
    const allowances = (sal.houseAllowance || 0) + (sal.transportAllowance || 0) + (sal.medicalAllowance || 0) + (sal.otherAllowance || 0);
    const deductions = (sal.taxDeduction || 0) + (sal.otherDeduction || 0);
    await Payroll.create({
      organizationId: orgId,
      branchId: b1,
      employeeId: e._id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      baseSalary: sal.base || 0,
      allowances,
      deductions,
      bonus: 0,
      netSalary: (sal.base || 0) + allowances - deductions,
      status: pick(["draft", "approved", "paid"]),
      paidAt: rand() > 0.5 ? new Date() : null,
      processedBy: hrManager._id,
    });
  }

  console.log("Seeding exams, marks and report cards...");
  const midterm = await Exam.create({
    organizationId: orgId,
    branchId: b1,
    academicYearId: ayId,
    name: "Mid Term Examination 2026",
    type: "midterm",
    startDate: new Date("2026-10-12"),
    endDate: new Date("2026-10-22"),
    classIds: classesByBranch[b1].map((c) => c.id),
    status: "published",
    gradingScale: DEFAULT_GRADING_SCALE,
    publishedAt: new Date("2026-10-30"),
    createdBy: principal._id,
  });
  await Exam.create({
    organizationId: orgId,
    branchId: b1,
    academicYearId: ayId,
    name: "Final Term Examination 2027",
    type: "final",
    startDate: new Date("2027-03-08"),
    endDate: new Date("2027-03-20"),
    classIds: classesByBranch[b1].map((c) => c.id),
    status: "scheduled",
    gradingScale: DEFAULT_GRADING_SCALE,
    createdBy: principal._id,
  });

  for (const s of mainStudents) {
    const classSubjects = subjects.filter((x) => x.classIds.includes(String(s.classId)));
    const subjectResults: any[] = [];
    let totalObtained = 0;
    let totalMarks = 0;
    for (const subj of classSubjects) {
      const obtained = randInt(35, 98);
      const gradeRow = calculateGrade(obtained);
      await Mark.create({
        organizationId: orgId,
        branchId: b1,
        examId: midterm._id,
        studentId: s._id,
        classId: s.classId,
        sectionId: s.sectionId,
        subjectId: subj.id,
        obtainedMarks: obtained,
        totalMarks: 100,
        grade: gradeRow.grade,
        gpa: gradeRow.gpa,
        status: "approved",
        enteredBy: teacherUsers[0].user._id,
        approvedBy: principal._id,
      });
      subjectResults.push({ subjectId: subj.id, name: subj.name, obtained, total: 100, grade: gradeRow.grade, gpa: gradeRow.gpa });
      totalObtained += obtained;
      totalMarks += 100;
    }
    const percentage = totalMarks ? Math.round((totalObtained / totalMarks) * 1000) / 10 : 0;
    const gradeRow = calculateGrade(percentage);
    await ReportCard.create({
      organizationId: orgId,
      branchId: b1,
      examId: midterm._id,
      studentId: s._id,
      classId: s.classId,
      sectionId: s.sectionId,
      subjects: subjectResults,
      totalObtained,
      totalMarks,
      percentage,
      gpa: gradeRow.gpa,
      grade: gradeRow.grade,
      position: 0,
      remarks: gradeRow.remarks,
      isPublished: true,
      publishedAt: new Date("2026-10-30"),
    });
  }
  // positions per section
  for (const cls of classesByBranch[b1]) {
    for (const sec of cls.sections) {
      const cards = await ReportCard.find({ examId: midterm._id, sectionId: sec.id }).sort({ totalObtained: -1 });
      for (let i = 0; i < cards.length; i++) {
        cards[i].position = i + 1;
        await cards[i].save();
      }
    }
  }

  console.log("Seeding homework, announcements, events...");
  for (const cls of classesByBranch[b1].slice(0, 5)) {
    const classSubjects = subjects.filter((x) => x.classIds.includes(cls.id));
    for (let i = 0; i < 2; i++) {
      await Homework.create({
        organizationId: orgId,
        branchId: b1,
        academicYearId: ayId,
        classId: cls.id,
        sectionId: cls.sections[0].id,
        subjectId: classSubjects[i % classSubjects.length].id,
        teacherId: teacherUsers[i % teacherUsers.length].user._id,
        title: pick([
          "Chapter 5 exercise questions",
          "Essay: My favourite season",
          "Science project on renewable energy",
          "Mathematics worksheet 3",
          "Reading comprehension practice",
        ]),
        description: "Complete all questions neatly in your notebook and submit before the due date.",
        dueDate: new Date(Date.now() + randInt(1, 7) * 86400000),
        status: "open",
      });
    }
  }

  const announcements = [
    ["Parent-Teacher Meeting", "The parent-teacher meeting for all classes will be held on Saturday at 9:00 AM. Attendance is mandatory for at least one guardian.", "parents", "high"],
    ["Mid Term Result Announcement", "Mid term results have been published. Parents can view and download report cards from the parent portal.", "all", "normal"],
    ["Annual Sports Day", "Annual sports day will be held next month. Trials begin from Monday during the games period.", "students", "normal"],
    ["Fee Submission Reminder", "Kindly clear outstanding fees before the 10th of this month to avoid late fee charges.", "parents", "urgent"],
    ["Staff Development Workshop", "A professional development workshop on modern teaching methodologies will be conducted this Friday.", "staff", "normal"],
    ["Winter Vacation Notice", "The school will remain closed for winter vacations from December 20 to January 5.", "all", "high"],
  ] as const;
  for (const [title, body, audience, priority] of announcements) {
    await Announcement.create({
      organizationId: orgId,
      branchId: b1,
      title,
      body,
      audience,
      priority,
      status: "published",
      publishedAt: daysAgo(randInt(0, 10)),
      createdBy: principal._id,
      channels: ["in_app", "email"],
    });
  }

  await Event.create([
    {
      organizationId: orgId,
      branchId: b1,
      title: "Parent-Teacher Meeting",
      description: "Term progress discussion with class teachers.",
      startDate: new Date(Date.now() + 3 * 86400000),
      endDate: new Date(Date.now() + 3 * 86400000),
      location: "Main Auditorium",
      type: "meeting",
      createdBy: principal._id,
    },
    {
      organizationId: orgId,
      branchId: b1,
      title: "Annual Sports Day",
      description: "Inter-house sports competitions and prize distribution.",
      startDate: new Date(Date.now() + 20 * 86400000),
      endDate: new Date(Date.now() + 21 * 86400000),
      location: "School Ground",
      type: "event",
      createdBy: principal._id,
    },
    {
      organizationId: orgId,
      branchId: b1,
      title: "Science Exhibition",
      description: "Students showcase innovative science projects.",
      startDate: new Date(Date.now() + 35 * 86400000),
      endDate: new Date(Date.now() + 35 * 86400000),
      location: "Science Block",
      type: "event",
      createdBy: principal._id,
    },
  ]);

  await Notification.create([
    {
      organizationId: orgId,
      branchId: b1,
      userId: parentUser._id,
      title: "Mid term result published",
      body: `${mainStudents[0].firstName}'s mid term report card is now available.`,
      type: "success",
      link: "/portal/results",
      isRead: false,
    },
    {
      organizationId: orgId,
      branchId: b1,
      userId: parentUser._id,
      title: "Fee reminder",
      body: "November fee voucher is due on the 10th.",
      type: "warning",
      link: "/portal/fees",
      isRead: false,
    },
    {
      organizationId: orgId,
      branchId: b1,
      userId: studentUser._id,
      title: "New homework assigned",
      body: "Check your homework for this week.",
      type: "info",
      link: "/portal/homework",
      isRead: false,
    },
  ]);

  console.log("Seeding optional modules...");
  const books = [
    ["The Alchemist", "Paulo Coelho", "Novel", "978-0061122415"],
    ["Physics for Grade 9", "Punjab Textbook Board", "Textbook", "978-969-1234-01-1"],
    ["Oxford English Grammar", "John Eastwood", "Reference", "978-019-431250-9"],
    ["Mathematics 8", "Punjab Textbook Board", "Textbook", "978-969-1234-02-8"],
    ["Stories for Children", "Roald Dahl", "Story", "978-014-241510-4"],
    ["Islamic Studies", "Dr. Zakir Naik", "Textbook", "978-969-1234-03-5"],
    ["Computer Science Basics", "S. Javed", "Textbook", "978-969-1234-04-2"],
    ["World History", "H. G. Wells", "Reference", "978-048-629093-5"],
    ["Chemistry Lab Manual", "Dr. A. Khan", "Reference", "978-969-1234-05-9"],
    ["Urdu Adab", "Mirza Ghalib", "Literature", "978-969-1234-06-6"],
  ] as const;
  const bookDocs: any[] = [];
  for (const [title, author, category, isbn] of books) {
    const copies = randInt(2, 8);
    const doc = await LibraryBook.create({
      organizationId: orgId,
      branchId: b1,
      title,
      author,
      category,
      isbn,
      copiesTotal: copies,
      copiesAvailable: copies,
      shelf: `S-${randInt(1, 12)}`,
      price: randInt(5, 25) * 100,
      publishedYear: randInt(1990, 2024),
    });
    bookDocs.push(doc);
  }
  for (let i = 0; i < 6; i++) {
    const book = pick(bookDocs);
    const student = pick(mainStudents);
    const issued = daysAgo(randInt(3, 25));
    const due = new Date(issued.getTime() + 14 * 86400000);
    const returned = rand() > 0.4;
    await LibraryTransaction.create({
      organizationId: orgId,
      branchId: b1,
      bookId: book._id,
      borrowerType: "student",
      studentId: student._id,
      issueDate: issued,
      dueDate: due,
      returnDate: returned ? new Date() : null,
      status: returned ? "returned" : due < new Date() ? "overdue" : "issued",
      fine: !returned && due < new Date() ? 200 : 0,
      issuedBy: librarian._id,
    });
  }

  const vehicles: any[] = [];
  for (let i = 0; i < 4; i++) {
    vehicles.push(
      await Vehicle.create({
        organizationId: orgId,
        branchId: b1,
        regNo: `LEB-2026-${String(1000 + i)}`,
        model: pick(["Toyota Coaster", "Hino Bus", "Suzuki Bolan", "Toyota Hiace"]),
        capacity: pick([15, 30, 45]),
        driverName: `${pick(FIRST_NAMES_M)} ${pick(LAST_NAMES)}`,
        driverPhone: `+92 30${randInt(0, 9)} ${randInt(1000000, 9999999)}`,
        driverLicense: `DL-${randInt(100000, 999999)}`,
        insuranceExpiry: addMonths(new Date(), randInt(1, 12)),
        status: "active",
      })
    );
  }
  const routeNames = ["Gulberg Route", "DHA Route", "Johar Town Route", "Model Town Route"];
  for (let i = 0; i < routeNames.length; i++) {
    await TransportRoute.create({
      organizationId: orgId,
      branchId: b1,
      name: routeNames[i],
      stops: [
        { name: "Main Boulevard", time: "07:00 AM" },
        { name: "Liberty Market", time: "07:15 AM" },
        { name: "School Gate", time: "07:45 AM" },
      ],
      fee: 3500 + i * 500,
      vehicleId: vehicles[i % vehicles.length]._id,
      driverName: vehicles[i % vehicles.length].driverName,
      driverPhone: vehicles[i % vehicles.length].driverPhone,
      isActive: true,
    });
  }

  await Hostel.create([
    {
      organizationId: orgId,
      branchId: b1,
      name: "Al-Farabi Boys Hostel",
      type: "boys",
      wardenName: "Mr. Abdul Rehman",
      wardenPhone: "+92 321 1234567",
      fee: 18000,
      rooms: [
        { roomNo: "101", capacity: 4, occupied: 3 },
        { roomNo: "102", capacity: 4, occupied: 4 },
        { roomNo: "103", capacity: 6, occupied: 2 },
      ],
      messEnabled: true,
    },
    {
      organizationId: orgId,
      branchId: b1,
      name: "Al-Zahra Girls Hostel",
      type: "girls",
      wardenName: "Mrs. Shazia Khan",
      wardenPhone: "+92 321 7654321",
      fee: 20000,
      rooms: [
        { roomNo: "201", capacity: 4, occupied: 2 },
        { roomNo: "202", capacity: 4, occupied: 1 },
      ],
      messEnabled: true,
    },
  ]);

  const inventoryItems = [
    ["A4 Paper Ream", "Stationery", 120, "ream", 850],
    ["Whiteboard Marker", "Stationery", 60, "pcs", 120],
    ["School Uniform Shirt", "Uniform", 200, "pcs", 1400],
    ["School Uniform Trouser", "Uniform", 180, "pcs", 1600],
    ["Science Lab Beaker", "Lab", 40, "pcs", 350],
    ["Football", "Sports", 15, "pcs", 2500],
    ["Printer Toner", "IT", 8, "pcs", 6500],
    ["Notebook (100 pages)", "Stationery", 300, "pcs", 180],
  ] as const;
  for (const [name, category, quantity, unit, unitPrice] of inventoryItems) {
    await InventoryItem.create({
      organizationId: orgId,
      branchId: b1,
      name,
      category,
      sku: `SKU-${randInt(10000, 99999)}`,
      quantity,
      unit,
      unitPrice,
      reorderLevel: Math.round(quantity * 0.2),
      supplier: pick(["City Supplies", "Al-Noor Traders", "Metro Wholesale"]),
      location: "Main Store",
    });
  }

  for (let i = 0; i < 5; i++) {
    const checkIn = new Date(Date.now() - randInt(1, 8) * 3600000);
    await Visitor.create({
      organizationId: orgId,
      branchId: b1,
      name: `${pick(FIRST_NAMES_M)} ${pick(LAST_NAMES)}`,
      phone: `+92 30${randInt(0, 9)} ${randInt(1000000, 9999999)}`,
      purpose: pick(["Parent meeting", "Vendor delivery", "Interview", "Fee inquiry", "Document submission"]),
      meetingWith: pick(["Principal", "Accounts Office", "Admissions Office", "HR Department"]),
      idProof: `CNIC-${randInt(1000000, 9999999)}`,
      badgeNo: `V-${String(i + 1).padStart(3, "0")}`,
      checkIn,
      checkOut: rand() > 0.4 ? new Date(checkIn.getTime() + 3600000) : null,
      status: rand() > 0.4 ? "checked_out" : "checked_in",
    });
  }

  await AuditLog.create([
    {
      organizationId: orgId,
      branchId: b1,
      userId: schoolAdmin._id,
      userName: "Hina Raza",
      userRole: "school_admin",
      action: "seed",
      entity: "system",
      description: "Demo data seeded for AI Solution IT School ERP",
    },
    {
      organizationId: orgId,
      branchId: b1,
      userId: principal._id,
      userName: "Dr. Sarah Ahmed",
      userRole: "principal",
      action: "publish",
      entity: "Exam",
      description: "Published Mid Term Examination 2026 results",
    },
    {
      organizationId: orgId,
      branchId: b1,
      userId: accountant._id,
      userName: "Faiza Noor",
      userRole: "accountant",
      action: "create",
      entity: "Invoice",
      description: "Generated monthly fee invoices",
    },
  ]);

  console.log("Writing seed data to Postgres...");
  await flushBatch();

  console.log("\n========================================================");
  console.log("  Seed complete!");
  console.log("========================================================");
  console.log(`  Organization : ${org.name}`);
  console.log(`  Branches     : Main Campus, City Campus`);
  console.log(`  Students     : ${studentDocs.length}`);
  console.log(`  Employees    : ${employees.length}`);
  console.log(`  Invoices     : ${invoiceDocs.length}`);
  console.log(`  Payments     : ${paymentDocs.length}`);
  console.log("--------------------------------------------------------");
  console.log("  LOGIN CREDENTIALS (password for all: Admin@123)");
  console.log("  Super Admin  : superadmin@school.edu");
  console.log("  School Admin : admin@school.edu");
  console.log("  Principal    : principal@school.edu");
  console.log("  Teacher      : teacher@school.edu");
  console.log("  Accountant   : accountant@school.edu");
  console.log("  HR Manager   : hr@school.edu");
  console.log("  Librarian    : librarian@school.edu");
  console.log("  Transport    : transport@school.edu");
  console.log("  Parent       : parent@school.edu  (password: Admin@123)");
  console.log("  Student      : student@school.edu (password: Admin@123)");
  console.log("========================================================\n");
}

async function shutdown() {
  await Promise.race([
    mongoose.disconnect().catch(() => null),
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]);
}

main()
  .then(async () => {
    await shutdown();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await shutdown();
    process.exit(1);
  });
