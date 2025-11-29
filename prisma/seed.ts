import {
  PrismaClient,
  Role,
  Gender,
  Religion,
  DayOfWeek,
  FeeType,
  ExamType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Clear existing data
  await prisma.transactionLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.studentMark.deleteMany();
  await prisma.examResult.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.feeVoucherItem.deleteMany();
  await prisma.feeVoucher.deleteMany();
  await prisma.feeStructure.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.teacherSalary.deleteMany();
  await prisma.promotionHistory.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.classSubject.deleteMany();
  await prisma.section.deleteMany();
  await prisma.class.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.period.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.userPermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.sequence.deleteMany();
  await prisma.backgroundJob.deleteMany();
  await prisma.schoolSettings.deleteMany();

  // Create sequences
  const sequences = [
    { id: "student", value: 0, prefix: "AHPS" },
    { id: "teacher", value: 0, prefix: "AHPS-T" },
    { id: "fee_voucher", value: 0, prefix: "FV" },
    { id: "payment", value: 0, prefix: "REC" },
    { id: "complaint", value: 0, prefix: "CMP" },
    { id: "salary", value: 0, prefix: "SAL" },
  ];

  for (const seq of sequences) {
    await prisma.sequence.create({ data: seq });
  }
  console.log("✅ Sequences created");

  // Create school settings
  await prisma.schoolSettings.create({
    data: {
      id: "default",
      schoolName: "Al-Huda Public School",
      schoolNameUrdu: "الہدیٰ پبلک سکول",
      address: "Main Road, Gulshan-e-Iqbal, Karachi",
      city: "Karachi",
      phone: "+92-21-34567890",
      email: "info@alhudapublicschool.edu.pk",
      feeGenerationDay: 1,
      feeDueDay: 10,
      lateFeeAfterDays: 15,
      defaultLateFee: 100,
      workingDays: [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
        DayOfWeek.SATURDAY,
      ],
    },
  });
  console.log("✅ School settings created");

  // Create Academic Year
  const academicYear = await prisma.academicYear.create({
    data: {
      name: "2024-2025",
      startDate: new Date("2024-04-01"),
      endDate: new Date("2025-03-31"),
      isCurrent: true,
      isActive: true,
    },
  });
  console.log("✅ Academic year created");

  // Create Super Admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const superAdmin = await prisma.user.create({
    data: {
      email: "admin@alhudapublicschool.edu.pk",
      username: "admin",
      name: "Super Administrator",
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
      phone: "+92-300-1234567",
      isActive: true,
      isSeeded: true,
    },
  });
  console.log("✅ Super Admin created");

  const users = [
    {
      email: "principal@alhudapublicschool.edu.pk",
      username: "principal",
      name: "Dr. Muhammad Ahmad",
      role: Role.PRINCIPAL,
      phone: "+92-300-2345678",
    },
    {
      email: "accountant@alhudapublicschool.edu.pk",
      username: "accountant",
      name: "Muhammad Ali Khan",
      role: Role.ACCOUNTANT,
      phone: "+92-300-3456789",
    },
    {
      email: "clerk@alhudapublicschool.edu.pk",
      username: "clerk",
      name: "Abdul Rehman",
      role: Role.CLERK,
      phone: "+92-300-4567890",
    },
  ];

  for (const user of users) {
    await prisma.user.create({
      data: {
        ...user,
        password: hashedPassword,
        isActive: true,
        isSeeded: true,
        createdById: superAdmin.id,
      },
    });
  }
  console.log("✅ Users created");

  // Create Subjects
  const subjectsData = [
    { code: "ENG", name: "English", nameUrdu: "انگریزی" },
    { code: "URD", name: "Urdu", nameUrdu: "اردو" },
    { code: "MATH", name: "Mathematics", nameUrdu: "ریاضی" },
    { code: "SCI", name: "Science", nameUrdu: "سائنس" },
    { code: "PHY", name: "Physics", nameUrdu: "طبیعیات" },
    { code: "CHEM", name: "Chemistry", nameUrdu: "کیمیا" },
    { code: "BIO", name: "Biology", nameUrdu: "حیاتیات" },
    { code: "COMP", name: "Computer Science", nameUrdu: "کمپیوٹر سائنس" },
    { code: "ISL", name: "Islamiat", nameUrdu: "اسلامیات" },
    { code: "PAK", name: "Pakistan Studies", nameUrdu: "مطالعہ پاکستان" },
    { code: "SS", name: "Social Studies", nameUrdu: "معاشرتی علوم" },
    { code: "GK", name: "General Knowledge", nameUrdu: "عمومی معلومات" },
    { code: "ART", name: "Art & Craft", nameUrdu: "آرٹ" },
    { code: "PE", name: "Physical Education", nameUrdu: "جسمانی تعلیم" },
    { code: "NAZ", name: "Nazra Quran", nameUrdu: "ناظرہ قرآن" },
  ];

  const subjects: Record<string, any> = {};
  for (const subj of subjectsData) {
    subjects[subj.code] = await prisma.subject.create({ data: subj });
  }
  console.log("✅ Subjects created");

  // Create Classes
  const classesData = [
    { name: "Play Group", displayOrder: 1 },
    { name: "Nursery", displayOrder: 2 },
    { name: "KG", displayOrder: 3 },
    { name: "Class 1", displayOrder: 4 },
    { name: "Class 2", displayOrder: 5 },
    { name: "Class 3", displayOrder: 6 },
    { name: "Class 4", displayOrder: 7 },
    { name: "Class 5", displayOrder: 8 },
    { name: "Class 6", displayOrder: 9 },
    { name: "Class 7", displayOrder: 10 },
    { name: "Class 8", displayOrder: 11 },
    { name: "Class 9", displayOrder: 12 },
    { name: "Class 10", displayOrder: 13 },
  ];

  const classes: Record<string, any> = {};
  for (const cls of classesData) {
    classes[cls.name] = await prisma.class.create({ data: cls });
  }
  console.log("✅ Classes created");

  // Create Sections for each class
  const sectionNames = ["A", "B", "C"];
  const sections: Record<string, any> = {};

  for (const cls of Object.values(classes)) {
    for (const secName of sectionNames) {
      const section = await prisma.section.create({
        data: {
          name: secName,
          classId: cls.id,
          capacity: 40,
        },
      });
      sections[`${cls.name}-${secName}`] = section;
    }
  }
  console.log("✅ Sections created");

  // Assign subjects to classes
  const primarySubjects = ["ENG", "URD", "MATH", "ISL", "GK", "ART", "NAZ"];
  const middleSubjects = [
    "ENG",
    "URD",
    "MATH",
    "SCI",
    "SS",
    "ISL",
    "COMP",
    "NAZ",
  ];
  const highSubjects = [
    "ENG",
    "URD",
    "MATH",
    "PHY",
    "CHEM",
    "BIO",
    "COMP",
    "ISL",
    "PAK",
  ];

  // Primary classes (Play Group - Class 5)
  for (const className of [
    "Play Group",
    "Nursery",
    "KG",
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
  ]) {
    for (const subCode of primarySubjects) {
      await prisma.classSubject.create({
        data: {
          classId: classes[className].id,
          subjectId: subjects[subCode].id,
        },
      });
    }
  }

  // Middle classes (Class 6-8)
  for (const className of ["Class 6", "Class 7", "Class 8"]) {
    for (const subCode of middleSubjects) {
      await prisma.classSubject.create({
        data: {
          classId: classes[className].id,
          subjectId: subjects[subCode].id,
        },
      });
    }
  }

  // High classes (Class 9-10)
  for (const className of ["Class 9", "Class 10"]) {
    for (const subCode of highSubjects) {
      await prisma.classSubject.create({
        data: {
          classId: classes[className].id,
          subjectId: subjects[subCode].id,
        },
      });
    }
  }
  console.log("✅ Class subjects assigned");

  // Create Periods
  const periodsData = [
    {
      periodNo: 1,
      name: "Period 1",
      startTime: "08:00",
      endTime: "08:40",
      isBreak: false,
    },
    {
      periodNo: 2,
      name: "Period 2",
      startTime: "08:40",
      endTime: "09:20",
      isBreak: false,
    },
    {
      periodNo: 3,
      name: "Period 3",
      startTime: "09:20",
      endTime: "10:00",
      isBreak: false,
    },
    {
      periodNo: 4,
      name: "Break",
      startTime: "10:00",
      endTime: "10:20",
      isBreak: true,
    },
    {
      periodNo: 5,
      name: "Period 4",
      startTime: "10:20",
      endTime: "11:00",
      isBreak: false,
    },
    {
      periodNo: 6,
      name: "Period 5",
      startTime: "11:00",
      endTime: "11:40",
      isBreak: false,
    },
    {
      periodNo: 7,
      name: "Period 6",
      startTime: "11:40",
      endTime: "12:20",
      isBreak: false,
    },
    {
      periodNo: 8,
      name: "Prayer Break",
      startTime: "12:20",
      endTime: "12:50",
      isBreak: true,
    },
    {
      periodNo: 9,
      name: "Period 7",
      startTime: "12:50",
      endTime: "13:30",
      isBreak: false,
    },
    {
      periodNo: 10,
      name: "Period 8",
      startTime: "13:30",
      endTime: "14:10",
      isBreak: false,
    },
  ];

  for (const period of periodsData) {
    await prisma.period.create({ data: period });
  }
  console.log("✅ Periods created");

  // Create Fee Structures
  const feeStructures = [
    {
      feeType: FeeType.ADMISSION_FEE,
      name: "Admission Fee",
      amount: 5000,
      isRecurring: false,
    },
    {
      feeType: FeeType.REGISTRATION_FEE,
      name: "Registration Fee",
      amount: 1000,
      isRecurring: false,
    },
    {
      feeType: FeeType.SECURITY_DEPOSIT,
      name: "Security Deposit",
      amount: 3000,
      isRecurring: false,
    },
    {
      feeType: FeeType.ANNUAL_FUND,
      name: "Annual Fund",
      amount: 2000,
      isRecurring: false,
    },
    {
      feeType: FeeType.EXAM_FEE,
      name: "Examination Fee",
      amount: 500,
      isRecurring: false,
    },
    {
      feeType: FeeType.LAB_FEE,
      name: "Lab Fee",
      amount: 300,
      isRecurring: false,
    },
    {
      feeType: FeeType.COMPUTER_FEE,
      name: "Computer Fee",
      amount: 400,
      isRecurring: false,
    },
    {
      feeType: FeeType.LIBRARY_FEE,
      name: "Library Fee",
      amount: 200,
      isRecurring: false,
    },
    {
      feeType: FeeType.SPORTS_FEE,
      name: "Sports Fee",
      amount: 300,
      isRecurring: false,
    },
    {
      feeType: FeeType.TRANSPORT_FEE,
      name: "Transport Fee",
      amount: 2000,
      isRecurring: true,
    },
    {
      feeType: FeeType.LATE_FEE,
      name: "Late Fee",
      amount: 100,
      isRecurring: false,
    },
  ];

  for (const fee of feeStructures) {
    await prisma.feeStructure.create({
      data: {
        ...fee,
        academicYearId: academicYear.id,
        dueDay: 10,
        lateFeeAmount: 100,
        lateFeeAfterDays: 15,
      },
    });
  }
  console.log("✅ Fee structures created");

  // Create sample Teachers
  const teachersData = [
    {
      firstName: "Fatima",
      lastName: "Ahmed",
      gender: Gender.FEMALE,
      cnic: "42101-1234567-1",
      phone: "+92-321-1234567",
      email: "fatima.ahmed@school.com",
      qualification: "M.A English, B.Ed",
      specialization: "English Literature",
      designation: "Senior Teacher",
      basicSalary: 45000,
    },
    {
      firstName: "Muhammad",
      lastName: "Hassan",
      gender: Gender.MALE,
      cnic: "42101-2345678-2",
      phone: "+92-321-2345678",
      email: "m.hassan@school.com",
      qualification: "M.Sc Mathematics",
      specialization: "Mathematics",
      designation: "Teacher",
      basicSalary: 40000,
    },
    {
      firstName: "Ayesha",
      lastName: "Khan",
      gender: Gender.FEMALE,
      cnic: "42101-3456789-3",
      phone: "+92-321-3456789",
      email: "ayesha.khan@school.com",
      qualification: "M.Sc Physics",
      specialization: "Physics",
      designation: "Teacher",
      basicSalary: 42000,
    },
    {
      firstName: "Ahmad",
      lastName: "Ali",
      gender: Gender.MALE,
      cnic: "42101-4567890-4",
      phone: "+92-321-4567890",
      email: "ahmad.ali@school.com",
      qualification: "M.A Urdu",
      specialization: "Urdu Literature",
      designation: "Teacher",
      basicSalary: 38000,
    },
    {
      firstName: "Zainab",
      lastName: "Fatima",
      gender: Gender.FEMALE,
      cnic: "42101-5678901-5",
      phone: "+92-321-5678901",
      email: "zainab.fatima@school.com",
      qualification: "M.Sc Chemistry",
      specialization: "Chemistry",
      designation: "Teacher",
      basicSalary: 40000,
    },
  ];

  let teacherCount = 0;
  for (const teacherData of teachersData) {
    teacherCount++;
    const employeeId = `AHPS-T-${String(teacherCount).padStart(3, "0")}`;

    // Create user account for teacher
    const teacherUser = await prisma.user.create({
      data: {
        email: teacherData.email,
        username: teacherData.email.split("@")[0],
        name: `${teacherData.firstName} ${teacherData.lastName}`,
        password: hashedPassword,
        role: Role.TEACHER,
        phone: teacherData.phone,
        isActive: true,
        isSeeded: true,
        createdById: superAdmin.id,
      },
    });

    await prisma.teacher.create({
      data: {
        employeeId,
        userId: teacherUser.id,
        firstName: teacherData.firstName,
        lastName: teacherData.lastName,
        gender: teacherData.gender,
        cnic: teacherData.cnic,
        phone: teacherData.phone,
        email: teacherData.email,
        address: "Karachi, Pakistan",
        qualification: teacherData.qualification,
        specialization: teacherData.specialization,
        designation: teacherData.designation,
        basicSalary: teacherData.basicSalary,
        experience: Math.floor(Math.random() * 10) + 1,
        createdById: superAdmin.id,
      },
    });
  }

  // Update sequence
  await prisma.sequence.update({
    where: { id: "teacher" },
    data: { value: teacherCount },
  });
  console.log("✅ Teachers created");

  // Create sample Students
  const studentFirstNames = [
    "Ali",
    "Sara",
    "Hassan",
    "Fatima",
    "Omar",
    "Ayesha",
    "Bilal",
    "Maryam",
    "Usman",
    "Zainab",
  ];
  const studentLastNames = [
    "Khan",
    "Ahmed",
    "Malik",
    "Hussain",
    "Raza",
    "Shah",
    "Ali",
    "Qureshi",
    "Siddiqui",
    "Iqbal",
  ];

  let studentCount = 0;
  const currentYear = new Date().getFullYear();

  for (const cls of ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"]) {
    for (const sec of ["A", "B"]) {
      for (let i = 0; i < 5; i++) {
        studentCount++;
        const firstName =
          studentFirstNames[
            Math.floor(Math.random() * studentFirstNames.length)
          ];
        const lastName =
          studentLastNames[Math.floor(Math.random() * studentLastNames.length)];
        const gender = Math.random() > 0.5 ? Gender.MALE : Gender.FEMALE;
        const registrationNo = `AHPS-${currentYear}-${String(
          studentCount
        ).padStart(4, "0")}`;
        const monthlyFee = 2000 + Math.floor(Math.random() * 5) * 500; // 2000-4500

        await prisma.student.create({
          data: {
            registrationNo,
            rollNo: String(i + 1),
            firstName,
            lastName,
            fatherName: `${
              studentLastNames[
                Math.floor(Math.random() * studentLastNames.length)
              ]
            } ${lastName}`,
            motherName: `${
              studentFirstNames[
                Math.floor(Math.random() * studentFirstNames.length)
              ]
            } Bibi`,
            dateOfBirth: new Date(
              2015 - parseInt(cls.split(" ")[1] || "1"),
              Math.floor(Math.random() * 12),
              Math.floor(Math.random() * 28) + 1
            ),
            gender,
            religion: Religion.ISLAM,
            address: `House # ${
              Math.floor(Math.random() * 100) + 1
            }, Block ${String.fromCharCode(
              65 + Math.floor(Math.random() * 10)
            )}, Gulshan-e-Iqbal`,
            guardianName: `Mr. ${
              studentLastNames[
                Math.floor(Math.random() * studentLastNames.length)
              ]
            } ${lastName}`,
            guardianRelation: "Father",
            guardianPhone: `+92-300-${String(
              Math.floor(Math.random() * 9000000) + 1000000
            )}`,
            guardianOccupation: [
              "Business",
              "Government Job",
              "Private Job",
              "Doctor",
              "Engineer",
            ][Math.floor(Math.random() * 5)],
            academicYearId: academicYear.id,
            sectionId: sections[`${cls}-${sec}`].id,
            monthlyFee,
            createdById: superAdmin.id,
          },
        });
      }
    }
  }

  // Update sequence
  await prisma.sequence.update({
    where: { id: "student" },
    data: { value: studentCount },
  });
  console.log("✅ Students created");

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
