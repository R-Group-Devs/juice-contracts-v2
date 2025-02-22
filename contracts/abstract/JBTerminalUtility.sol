// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import './../interfaces/IJBTerminalUtility.sol';

// --------------------------- custom errors -------------------------- //
//*********************************************************************//
error TERMINAL_UNAUTHORIZED();

/** 
  @notice
  Provides tools for contracts that has functionality that can only be accessed by a project's terminals.
*/
abstract contract JBTerminalUtility is IJBTerminalUtility {
  modifier onlyTerminal(uint256 _projectId) {
    if (!directory.isTerminalDelegateOf(_projectId, msg.sender)) {
      revert TERMINAL_UNAUTHORIZED();
    }
    _;
  }

  /** 
    @notice 
    The directory of terminals and controllers for projects.
  */
  IJBDirectory public immutable override directory;

  /** 
    @param _directory A contract storing directories of terminals and controllers for each project.
  */
  constructor(IJBDirectory _directory) {
    directory = _directory;
  }
}
