// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Token whose `approve` calls back into a configurable target. Used to
///      verify that BiviumProfile.fulfillBorrow's `nonReentrant` modifier
///      detects and reverts a re-entry.
contract ReentrantToken {
    string public name = "REENTER";
    string public symbol = "REENTER";
    uint8 public decimals = 18;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    address public target;
    bytes public reenterData;
    bool public armed;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function arm(address target_, bytes calldata data_) external {
        target = target_;
        reenterData = data_;
        armed = true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);

        if (armed) {
            armed = false;
            (bool ok, bytes memory ret) = target.call(reenterData);
            if (!ok) {
                assembly {
                    revert(add(ret, 0x20), mload(ret))
                }
            }
        }
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        if (a != type(uint256).max) {
            allowance[from][msg.sender] = a - amount;
        }
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
