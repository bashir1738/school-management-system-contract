import { expect } from "chai";
import { ethers } from "hardhat";

describe("School Management Contracts", function () {

    // ─── Shared fixtures ──────────────────────────────────────────────────────
    let teachersContract, studentsContract, hybitToken;
    let owner, teacher, student, other;

    beforeEach(async function () {
        [owner, teacher, student, other] = await ethers.getSigners();

        // 1. Deploy HybitToken
        const HybitToken = await ethers.getContractFactory("HybitToken");
        hybitToken = await HybitToken.deploy();
        await hybitToken.waitForDeployment();

        // 2. Deploy Teachers
        const Teachers = await ethers.getContractFactory("Teachers");
        teachersContract = await Teachers.deploy();
        await teachersContract.waitForDeployment();

        // 3. Deploy Students with the real token address
        const Students = await ethers.getContractFactory("Students");
        studentsContract = await Students.deploy(await hybitToken.getAddress());
        await studentsContract.waitForDeployment();
    });

    // ─── HybitToken ───────────────────────────────────────────────────────────
    describe("HybitToken (ERC20)", function () {
        it("Should have the correct name and symbol", async function () {
            expect(await hybitToken.name()).to.equal("Hybit Token");
            expect(await hybitToken.symbol()).to.equal("HBT");
            expect(await hybitToken.decimals()).to.equal(18);
        });

        it("Should mint 1,000,000 HBT to the deployer on construction", async function () {
            const expected = ethers.parseEther("1000000");
            expect(await hybitToken.totalSupply()).to.equal(expected);
            expect(await hybitToken.balanceOf(owner.address)).to.equal(expected);
        });

        it("Should allow the owner to transfer tokens", async function () {
            const amount = ethers.parseEther("500");
            await expect(hybitToken.transfer(student.address, amount))
                .to.emit(hybitToken, "Transfer")
                .withArgs(owner.address, student.address, amount);

            expect(await hybitToken.balanceOf(student.address)).to.equal(amount);
        });

        it("Should allow approve + transferFrom", async function () {
            const amount = ethers.parseEther("100");
            await hybitToken.approve(other.address, amount);

            expect(await hybitToken.allowance(owner.address, other.address)).to.equal(amount);

            await expect(
                hybitToken.connect(other).transferFrom(owner.address, student.address, amount)
            )
                .to.emit(hybitToken, "Transfer")
                .withArgs(owner.address, student.address, amount);
        });

        it("Should revert transfer when balance is insufficient", async function () {
            const tooMuch = ethers.parseEther("9999999");
            await expect(
                hybitToken.connect(student).transfer(owner.address, tooMuch)
            ).to.be.revertedWith("Insufficient balance");
        });

        it("Should allow owner to mint additional tokens", async function () {
            const mintAmount = ethers.parseEther("500");
            await hybitToken.mint(student.address, mintAmount);
            expect(await hybitToken.balanceOf(student.address)).to.equal(mintAmount);
        });

        it("Should revert mint from non-owner", async function () {
            await expect(
                hybitToken.connect(student).mint(student.address, ethers.parseEther("1"))
            ).to.be.revertedWith("Only the owner can call this function");
        });
    });

    // ─── Teachers ─────────────────────────────────────────────────────────────
    describe("Teachers Contract", function () {
        it("Should set the right admin on deployment", async function () {
            expect(await teachersContract.admin()).to.equal(owner.address);
        });

        it("Should let admin add a teacher and emit TeacherAdded", async function () {
            await expect(
                teachersContract.addTeacher(1, teacher.address, "John Doe", 35, "Physics")
            )
                .to.emit(teachersContract, "TeacherAdded")
                .withArgs(1, "John Doe", "Physics");

            const t = await teachersContract.teachers(1);
            expect(t.name).to.equal("John Doe");
            expect(t.subject).to.equal("Physics");
            expect(t.account).to.equal(teacher.address);
        });

        it("Should register address and ID mappings after addTeacher", async function () {
            await teachersContract.addTeacher(2, teacher.address, "Jane", 40, "Math");
            expect(await teachersContract.teacherAddressExists(teacher.address)).to.be.true;
            expect(await teachersContract.teacherIds(teacher.address)).to.equal(2);
        });

        it("Should revert when non-admin tries to add teacher", async function () {
            await expect(
                teachersContract.connect(other).addTeacher(3, other.address, "Hacker", 25, "None")
            ).to.be.revertedWith("Only admin can call this");
        });

        it("Should revert adding a duplicate teacher ID", async function () {
            await teachersContract.addTeacher(1, teacher.address, "John", 35, "Physics");
            await expect(
                teachersContract.addTeacher(1, other.address, "Duplicate", 30, "Math")
            ).to.be.revertedWith("Teacher already exists");
        });

        it("Should revert adding a teacher with zero ID", async function () {
            await expect(
                teachersContract.addTeacher(0, teacher.address, "Zero", 30, "Art")
            ).to.be.revertedWith("Teacher ID cannot be zero");
        });

        it("Should allow marking student attendance and emit event", async function () {
            await teachersContract.addTeacher(1, teacher.address, "John", 35, "Physics");
            await expect(teachersContract.markStudentAttendance(1, 101))
                .to.emit(teachersContract, "AttendanceMarked")
                .withArgs(1, 101);

            expect(await teachersContract.studentAttendance(1, 101)).to.be.true;
        });

        it("Should allow assigning a grade to a student", async function () {
            await teachersContract.addTeacher(1, teacher.address, "John", 35, "Physics");
            await expect(teachersContract.assignGrade(1, 101, "A+"))
                .to.emit(teachersContract, "GradeAssigned")
                .withArgs(1, 101, "A+");

            expect(await teachersContract.assignedGrades(1, 101)).to.equal("A+");
        });

        it("Should allow giving assignments to students", async function () {
            await teachersContract.addTeacher(1, teacher.address, "John", 35, "Physics");
            await expect(teachersContract.giveAssignment(1, 101, "Lab Report 1"))
                .to.emit(teachersContract, "AssignmentGiven")
                .withArgs(1, 101, "Lab Report 1");
        });
    });

    // ─── Students ─────────────────────────────────────────────────────────────
    describe("Students Contract", function () {
        it("Should set the right admin on deployment", async function () {
            expect(await studentsContract.admin()).to.equal(owner.address);
        });

        it("Should store the payment token address", async function () {
            expect(await studentsContract.paymentTokenAddress()).to.equal(
                await hybitToken.getAddress()
            );
        });

        it("Should allow admin to register and unregister a teacher", async function () {
            await studentsContract.registerTeacher(teacher.address);
            expect(await studentsContract.teacherAddressExists(teacher.address)).to.be.true;

            await studentsContract.unregisterTeacher(teacher.address);
            expect(await studentsContract.teacherAddressExists(teacher.address)).to.be.false;
        });

        it("Should revert registerTeacher from non-admin", async function () {
            await expect(
                studentsContract.connect(other).registerTeacher(teacher.address)
            ).to.be.revertedWith("Only admin can call this");
        });

        it("Should allow a registered teacher to add a student and emit StudentAdded", async function () {
            await studentsContract.registerTeacher(teacher.address);

            await expect(
                studentsContract.connect(teacher).addStudent(101, "Alice", 20, "Blockchain 101")
            )
                .to.emit(studentsContract, "StudentAdded")
                .withArgs(101, "Alice", "Blockchain 101");

            const s = await studentsContract.students(101);
            expect(s.name).to.equal("Alice");
            expect(s.course).to.equal("Blockchain 101");
        });

        it("Should revert addStudent if caller is not a registered teacher", async function () {
            await expect(
                studentsContract.connect(other).addStudent(102, "Bob", 21, "DeFi")
            ).to.be.revertedWith("Only existing teachers can add students");
        });

        it("Should revert addStudent with duplicate ID", async function () {
            await studentsContract.registerTeacher(teacher.address);
            await studentsContract.connect(teacher).addStudent(101, "Alice", 20, "Blockchain 101");
            await expect(
                studentsContract.connect(teacher).addStudent(101, "Duplicate", 22, "DeFi")
            ).to.be.revertedWith("Student already exists");
        });

        it("Should allow a student to pay fees in ETH and emit FeePaid", async function () {
            await studentsContract.registerTeacher(teacher.address);
            await studentsContract.connect(teacher).addStudent(101, "Alice", 20, "Blockchain 101");

            const feeAmount = ethers.parseEther("0.01");
            await expect(
                studentsContract.connect(student).payFeeWithEth(101, { value: feeAmount })
            )
                .to.emit(studentsContract, "FeePaid")
                .withArgs(101, "ETH", feeAmount);

            expect(await studentsContract.feePaid(101)).to.be.true;
        });

        it("Should revert ETH fee payment with wrong amount", async function () {
            await studentsContract.registerTeacher(teacher.address);
            await studentsContract.connect(teacher).addStudent(101, "Alice", 20, "Blockchain 101");

            await expect(
                studentsContract.connect(student).payFeeWithEth(101, { value: ethers.parseEther("0.005") })
            ).to.be.revertedWith("Incorrect ETH amount sent. Fee is 0.01 ETH");
        });

        it("Should revert if fee is paid twice", async function () {
            await studentsContract.registerTeacher(teacher.address);
            await studentsContract.connect(teacher).addStudent(101, "Alice", 20, "Blockchain 101");

            const fee = ethers.parseEther("0.01");
            await studentsContract.connect(student).payFeeWithEth(101, { value: fee });
            await expect(
                studentsContract.connect(student).payFeeWithEth(101, { value: fee })
            ).to.be.revertedWith("Fee already paid");
        });

        it("Should allow a student to pay fees with ERC20 token", async function () {
            await studentsContract.registerTeacher(teacher.address);
            await studentsContract.connect(teacher).addStudent(101, "Alice", 20, "Blockchain 101");

            const tokenFee = ethers.parseEther("100");
            // Owner has all tokens; transfer some to student
            await hybitToken.transfer(student.address, tokenFee);
            // Student approves Students contract
            await hybitToken.connect(student).approve(await studentsContract.getAddress(), tokenFee);

            await expect(studentsContract.connect(student).payFeeWithToken(101))
                .to.emit(studentsContract, "FeePaid")
                .withArgs(101, "TOKEN", tokenFee);

            expect(await studentsContract.feePaid(101)).to.be.true;
        });

        it("Should allow a student to submit an assignment", async function () {
            await studentsContract.registerTeacher(teacher.address);
            await studentsContract.connect(teacher).addStudent(101, "Alice", 20, "Blockchain 101");

            await expect(studentsContract.connect(student).submitAssignment(101, "Homework 1"))
                .to.emit(studentsContract, "AssignmentSubmitted")
                .withArgs(101, "Homework 1");

            expect(await studentsContract.assignmentsSubmitted(101, "Homework 1")).to.be.true;
        });

        it("Should revert duplicate assignment submission", async function () {
            await studentsContract.registerTeacher(teacher.address);
            await studentsContract.connect(teacher).addStudent(101, "Alice", 20, "Blockchain 101");
            await studentsContract.connect(student).submitAssignment(101, "Homework 1");

            await expect(
                studentsContract.connect(student).submitAssignment(101, "Homework 1")
            ).to.be.revertedWith("Assignment already submitted");
        });

        it("Should return 'No grades assigned yet.' for a new student", async function () {
            await studentsContract.registerTeacher(teacher.address);
            await studentsContract.connect(teacher).addStudent(101, "Alice", 20, "Blockchain 101");
            expect(await studentsContract.viewGrades(101)).to.equal("No grades assigned yet.");
        });
    });
});
