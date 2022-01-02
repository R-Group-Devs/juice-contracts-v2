import { expect } from 'chai';
import { ethers } from 'hardhat';

import { deployMockContract } from '@ethereum-waffle/mock-contract';

import { getTimestamp, createFundingCycleData } from '../helpers/utils';

import jbDirectory from '../../artifacts/contracts/JBDirectory.sol/JBDirectory.json';
import ijbFundingCycleBallot from '../../artifacts/contracts/interfaces/IJBFundingCycleBallot.sol/IJBFundingCycleBallot.json';

describe('JBFundingCycleStore::queuedOf(...)', function () {
  const PROJECT_ID = 2;

  const EMPTY_FUNDING_CYCLE = {
    number: ethers.BigNumber.from(0),
    configuration: ethers.BigNumber.from(0),
    basedOn: ethers.BigNumber.from(0),
    start: ethers.BigNumber.from(0),
    duration: ethers.BigNumber.from(0),
    weight: ethers.BigNumber.from(0),
    discountRate: ethers.BigNumber.from(0),
    ballot: ethers.constants.AddressZero,
    metadata: ethers.BigNumber.from(0)
  };

  async function setup() {
    const [deployer, controller, ...addrs] = await ethers.getSigners();

    const mockJbDirectory = await deployMockContract(deployer, jbDirectory.abi);
    const mockBallot = await deployMockContract(deployer, ijbFundingCycleBallot.abi);

    const jbFundingCycleStoreFactory = await ethers.getContractFactory('JBFundingCycleStore');
    const jbFundingCycleStore = await jbFundingCycleStoreFactory.deploy(mockJbDirectory.address);

    return {
      controller,
      mockJbDirectory,
      jbFundingCycleStore,
      mockBallot,
      addrs
    };
  }

  const cleanFundingCycle = (fc) => ({
    number: fc[0],
    configuration: fc[1],
    basedOn: fc[2],
    start: fc[3],
    duration: fc[4],
    weight: fc[5],
    discountRate: fc[6],
    ballot: fc[7],
    metadata: fc[8]
  });


  it("Should create current funding cycle", async function () {
    const { controller, mockJbDirectory, mockBallot, jbFundingCycleStore } = await setup();
    await mockJbDirectory.mock.controllerOf.withArgs(PROJECT_ID).returns(controller.address);

    const discountRate = 0.5; // Use a discount rate of 50%

    const discountRateFidelity = 100000000; // Discount rates are stored out of this number

    const fundingCycleData = createFundingCycleData({ ballot: mockBallot.address, discountRate: ethers.BigNumber.from(discountRateFidelity * discountRate) });

    // The metadata value doesn't affect the test.
    const fundingCycleMetadata = ethers.BigNumber.from(123);

    // Configure funding cycle
    const configureForTx = await jbFundingCycleStore
      .connect(controller)
      .configureFor(PROJECT_ID, fundingCycleData, fundingCycleMetadata);

    // The timestamp the configuration was made during.
    const configurationTimestamp = await getTimestamp(configureForTx.blockNumber);

    const expectedQueuedFundingCycle = {
      number: ethers.BigNumber.from(2),
      configuration: configurationTimestamp,
      basedOn: ethers.BigNumber.from(0),
      start: configurationTimestamp.add(fundingCycleData.duration),
      duration: fundingCycleData.duration,
      weight: fundingCycleData.weight.div(1 / discountRate),
      discountRate: fundingCycleData.discountRate,
      ballot: fundingCycleData.ballot,
      metadata: fundingCycleMetadata
    };

    // The `queuedOf` should contain the properties of the current cycle, with a new number, start, and weight.
    expect(cleanFundingCycle(await jbFundingCycleStore.queuedOf(PROJECT_ID))).to.eql(
      expectedQueuedFundingCycle
    );
  });

  // it("Can't configure if caller is not project's controller", async function () {
  //   const { controller, mockJbDirectory, mockBallot, jbFundingCycleStore, addrs } = await setup();
  //   const [nonController] = addrs;
  //   await mockJbDirectory.mock.controllerOf.withArgs(PROJECT_ID).returns(controller.address);

  //   const fundingCycleData = createFundingCycleData({ ballot: mockBallot.address });

  //   await expect(
  //     jbFundingCycleStore.connect(nonController).configureFor(PROJECT_ID, fundingCycleData, 0),
  //   ).to.be.revertedWith('0x4f: UNAUTHORIZED');
  // });

  // it(`Can't configure if funding cycle duration is shorter than 1000 seconds`, async function () {
  //   const { controller, mockJbDirectory, mockBallot, jbFundingCycleStore } = await setup();
  //   await mockJbDirectory.mock.controllerOf.withArgs(PROJECT_ID).returns(controller.address);

  //   const fundingCycleData = createFundingCycleData({ duration: 999, ballot: mockBallot.address });

  //   await expect(
  //     jbFundingCycleStore.connect(controller).configureFor(PROJECT_ID, fundingCycleData, 0),
  //   ).to.be.revertedWith('0x15: BAD_DURATION');
  // });

  // it(`Can't configure if funding cycle discount rate is above 100%`, async function () {
  //   const { controller, mockJbDirectory, mockBallot, jbFundingCycleStore } = await setup();
  //   await mockJbDirectory.mock.controllerOf.withArgs(PROJECT_ID).returns(controller.address);

  //   const fundingCycleData = createFundingCycleData({
  //     discountRate: 1000000001,
  //     ballot: mockBallot.address,
  //   });

  //   await expect(
  //     jbFundingCycleStore.connect(controller).configureFor(PROJECT_ID, fundingCycleData, 0),
  //   ).to.be.revertedWith('0x16: BAD_DISCOUNT_RATE');
  // });

  // it(`Can't configure if funding cycle weight larger than uint88_max`, async function () {
  //   const { controller, mockJbDirectory, mockBallot, jbFundingCycleStore } = await setup();
  //   await mockJbDirectory.mock.controllerOf.withArgs(PROJECT_ID).returns(controller.address);

  //   const badWeight = ethers.BigNumber.from('1').shl(88);

  //   const fundingCycleData = createFundingCycleData({
  //     weight: badWeight,
  //     ballot: mockBallot.address,
  //   });

  //   await expect(
  //     jbFundingCycleStore.connect(controller).configureFor(PROJECT_ID, fundingCycleData, 0),
  //   ).to.be.revertedWith('0x18: BAD_WEIGHT');
  // });
});
