// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract HybitToken {
    string public constant name = "Hybit Token";
    string public constant symbol = "HBT";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    address public owner;

    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowances;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    modifier validAddress(address _addr) {
        require(_addr != address(0), "Address cannot be zero");
        _;
    }

    constructor() {
        owner = msg.sender;
        uint256 initialSupply = 1000000 * 10**18;
        balances[msg.sender] = initialSupply;
        totalSupply = initialSupply;
        emit Transfer(address(0), msg.sender, initialSupply);
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function transfer(address to, uint256 amount) external validAddress(to) returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;
        balances[to] += amount;

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external validAddress(spender) returns (bool) {
        allowances[msg.sender][spender] = amount;
        
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function allowance(address ownerAddr, address spender) external view returns (uint256) {
        return allowances[ownerAddr][spender];
    }

    function transferFrom(address from, address to, uint256 amount) external validAddress(from) validAddress(to) returns (bool) {
        require(balances[from] >= amount, "Insufficient balance");
        require(allowances[from][msg.sender] >= amount, "Allowance exceeded");

        balances[from] -= amount;
        balances[to] += amount;
        allowances[from][msg.sender] -= amount;

        emit Transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external onlyOwner validAddress(to) {
        balances[to] += amount;
        totalSupply += amount;
        
        emit Transfer(address(0), to, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner validAddress(newOwner) {
        owner = newOwner;
    }
}

