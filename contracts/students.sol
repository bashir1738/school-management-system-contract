// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

contract Students {
    struct Student {
        uint id;
        string name;
        uint age;
        string course;
    }

    mapping(uint => Student) public students;
    mapping(uint => string) public studentGrades;
    mapping(uint => mapping(string => bool)) public assignmentsSubmitted;
    mapping(uint => bool) public feePaid;
    mapping(address => bool) public teacherAddressExists;

    address public admin;
    address public paymentTokenAddress;
    uint256 public constant ETH_FEE = 0.05 ether;
    uint256 public constant TOKEN_FEE = 50 * 10**18;

    event StudentAdded(uint indexed id, string name, string course);
    event FeePaid(uint indexed studentId, string method, uint256 amount);
    event AssignmentSubmitted(uint indexed studentId, string assignmentName);

    constructor(address _paymentTokenAddress) {
        admin = msg.sender;
        paymentTokenAddress = _paymentTokenAddress;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only the admin can call this");
        _;
    }

    modifier onlyRegisteredTeacher() {
        require(teacherAddressExists[msg.sender], "Only the  existing teachers can add students");
        _;
    }

    modifier studentExists(uint _studentId) {
        require(students[_studentId].id != 0, "The student does not exist");
        _;
    }

    function registerTeacher(address _teacher) public onlyAdmin {
        require(_teacher != address(0), "Teacher address cannot be zero");
        teacherAddressExists[_teacher] = true;
    }

    function unregisterTeacher(address _teacher) public onlyAdmin {
        require(teacherAddressExists[_teacher], "Teacher address not registered");
        teacherAddressExists[_teacher] = false;
    }

    function addStudent(uint _id, string memory _name, uint _age, string memory _course) public onlyRegisteredTeacher {
        require(_id != 0, "Student ID cannot be zero");
        require(students[_id].id == 0, "Student already exists");
        
        students[_id] = Student(_id, _name, _age, _course);
        emit StudentAdded(_id, _name, _course);
    }

    function viewGrades(uint _studentId) public view studentExists(_studentId) returns (string memory) {
        string memory grade = studentGrades[_studentId];
        if (bytes(grade).length == 0) {
            return "No grades have been assigned.";
        }
        return grade;
    }

    function submitAssignment(uint _studentId, string memory _assignmentName) public studentExists(_studentId) {
        require(!assignmentsSubmitted[_studentId][_assignmentName], "Assignment has been submitted");

        assignmentsSubmitted[_studentId][_assignmentName] = true;
        emit AssignmentSubmitted(_studentId, _assignmentName);
    }

    function payFeeWithEth(uint _studentId) public payable studentExists(_studentId) {
        require(!feePaid[_studentId], "Fee has been paid");
        require(msg.value == ETH_FEE, "Incorrect ETH amount sent. Fee is 0.05 ETH");

        feePaid[_studentId] = true;
        emit FeePaid(_studentId, "ETH", msg.value);
    }

    function payFeeWithToken(uint _studentId) public studentExists(_studentId) {
        require(!feePaid[_studentId], "Fee has been paid");
        require(paymentTokenAddress != address(0), "Payment token not set");

        IERC20 token = IERC20(paymentTokenAddress);
        require(token.transferFrom(msg.sender, address(this), TOKEN_FEE), "Token transfer failed");

        feePaid[_studentId] = true;
        emit FeePaid(_studentId, "TOKEN", TOKEN_FEE);
    }
}