// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
interface IRoom {
    function approveRoom(uint256 id, bool approval) external;
    function cancel(uint256 id) external;
    function refund(uint256 id) external;
    function fund(uint256 id) external payable;
}
/// @dev Test-only recipient for rejection and callback/reentrancy cases.
contract TestParticipant {
    bool public rejectPayment;
    bool public attemptReentrancy;
    bool public reentrySucceeded;
    address public room;
    uint256 public roomId;
    function configure(address target, uint256 id, bool reject, bool reenter) external {
        room = target; roomId = id; rejectPayment = reject; attemptReentrancy = reenter;
    }
    function approve(address target, uint256 id) external { IRoom(target).approveRoom(id, true); }
    function fund(address target, uint256 id) external payable { IRoom(target).fund{value: msg.value}(id); }
    function cancel(address target, uint256 id) external { IRoom(target).cancel(id); }
    function refund(address target, uint256 id) external { IRoom(target).refund(id); }
    receive() external payable {
        require(!rejectPayment, "Recipient rejected payment");
        if (attemptReentrancy) { (reentrySucceeded,) = room.call(abi.encodeWithSignature("settle(uint256)", roomId)); }
    }
}
