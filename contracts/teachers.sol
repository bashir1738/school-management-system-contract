// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


contract Teachers {
    struct Teacher {
        uint id;
        string name;
        uint age;
        string subject;
        address account;
    }

    address public admin;
    mapping(uint => Teacher) public teachers;
    mapping(address => bool) public teacherAddressExists;
    mapping(address => uint) public teacherIds;
    
    mapping(uint => mapping(uint => bool)) public studentAttendance;
    mapping(uint => mapping(uint => string)) public assignedGrades;
    mapping(uint => mapping(uint => string[])) public teacherAssignments;

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }

    modifier teacherExists(uint _teacherId) {
        require(teachers[_teacherId].id != 0, "Teacher not found");
        _;
    }

    event TeacherAdded(uint indexed id, string name, string subject);
    event AttendanceMarked(uint indexed teacherId, uint indexed studentId);
    event GradeAssigned(uint indexed teacherId, uint indexed studentId, string grade);
    event AssignmentGiven(uint indexed teacherId, uint indexed studentId, string assignmentName);

    function addTeacher(uint _id, address _account, string memory _name, uint _age, string memory _subject) public onlyAdmin {
        require(_id != 0, "Teacher ID cannot be zero");
        require(_account != address(0), "Teacher account cannot be zero address");
        require(teachers[_id].id == 0, "Teacher already exists");
        require(!teacherAddressExists[_account], "Teacher address already registered");

        teachers[_id] = Teacher(_id, _name, _age, _subject, _account);
        teacherAddressExists[_account] = true;
        teacherIds[_account] = _id;
        emit TeacherAdded(_id, _name, _subject);
    }

    function getStudents() public pure returns (string memory) {
        return "List of students.";
    }

    function markStudentAttendance(uint _teacherId, uint _studentId) public teacherExists(_teacherId) {
        require(_studentId != 0, "Student ID cannot be zero");

        studentAttendance[_teacherId][_studentId] = true;
        emit AttendanceMarked(_teacherId, _studentId);
    }

    function assignGrade(uint _teacherId, uint _studentId, string memory _grade) public teacherExists(_teacherId) {
        require(_studentId != 0, "Student ID cannot be zero");

        assignedGrades[_teacherId][_studentId] = _grade;
        emit GradeAssigned(_teacherId, _studentId, _grade);
    }

    function giveAssignment(uint _teacherId, uint _studentId, string memory _assignment) public teacherExists(_teacherId) {
        require(_studentId != 0, "Student ID cannot be zero");

        teacherAssignments[_teacherId][_studentId].push(_assignment);
        emit AssignmentGiven(_teacherId, _studentId, _assignment);
    }
}



