import MerkleTree from './merkle-tree'
import { BigNumber, utils } from 'ethers'

export default class BalanceTreeModified {
    private readonly tree: MerkleTree
    constructor(balances: { account: string; }[]) {
        this.tree = new MerkleTree(
            balances.map(({ account }, index) => {
                return BalanceTreeModified.toNode(index, account)
            })
        )
    }

    public static verifyProof(
        index: number | BigNumber,
        account: string,
        proof: Buffer[],
        root: Buffer
    ): boolean {
        let pair = BalanceTreeModified.toNode(index, account)
        for (const item of proof) {
            pair = MerkleTree.combinedHash(pair, item)
        }

        return pair.equals(root)
    }

    // keccak256(abi.encode(index, account, amount))
    public static toNode(index: number | BigNumber, account: string): Buffer {
        return Buffer.from(
            utils.solidityKeccak256(['uint256', 'address'], [index, account]).substr(2),
            'hex'
        )
    }

    public getHexRoot(): string {
        return this.tree.getHexRoot()
    }

    // returns the hex bytes32 values of the proof
    public getProof(index: number | BigNumber, account: string): string[] {
        return this.tree.getHexProof(BalanceTreeModified.toNode(index, account))
    }
}