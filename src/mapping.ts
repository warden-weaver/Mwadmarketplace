import { Transfer as TransferEvent } from "../generated/MetaWarden/MetaWarden";
import { MetaWarden, Owner, Stat, Transfer } from "../generated/schema";
import { Address, BigInt, log, store, Bytes } from "@graphprotocol/graph-ts";
import {
    ZERO,
    ONE,
    NFTRADE_MARKET_ADDRESS,
    TOFU_MARKET_ADDRESS,
} from "./constant";

export const getOrCreateTransfer = (
    event: TransferEvent,
    stat: Stat
): Transfer => {
    let id =
        event.transaction.hash.toHexString() + event.logIndex.toHexString();
    let transfer = Transfer.load(id);
    if (transfer === null) {
        transfer = new Transfer(id);
        transfer.txHash = event.transaction.hash;
        transfer.logIndex = event.logIndex;
        transfer.from = event.transaction.from as Bytes;
        transfer.to = event.transaction.to as Bytes;
        transfer.input = event.transaction.input;
        transfer.blockNumber = event.block.number;
        transfer.blockTimestamp = event.block.timestamp;

        if (event.transaction.to.equals(Address.fromString(NFTRADE_MARKET_ADDRESS))) {
            transfer.dexName = "NFTRADE";
        } else if (event.transaction.to.equals(Address.fromString(TOFU_MARKET_ADDRESS))) {
            transfer.dexName = "TOFU";
        } else {
            transfer.dexName = "";
        }

        stat.transferCount = stat.transferCount.plus(ONE);
    }
    return transfer as Transfer;
};

export const getOrCreateOwner = (ownerAddress: Address, stat: Stat): Owner => {
    let owner = Owner.load(ownerAddress.toHexString());
    if (owner === null) {
        owner = new Owner(ownerAddress.toHexString());
        owner.assetCount = ZERO;

        stat.ownerCount = stat.ownerCount.plus(ONE);
    }
    return owner as Owner;
};

export const removeOwner = (ownerAddress: Address, stat: Stat): void => {
    let owner = Owner.load(ownerAddress.toHexString());
    if (owner !== null) {
        store.remove("Owner", ownerAddress.toHexString());

        let tmp = stat.ownerCount.minus(ONE);
        if (tmp.lt(ZERO)) {
            tmp = ZERO;
        }
        stat.ownerCount = tmp;
    }
};

export const getOrCreateStat = (mwadAddress: Address): Stat => {
    let stat = Stat.load(mwadAddress.toHexString());
    if (stat === null) {
        stat = new Stat(mwadAddress.toHexString());
        stat.ownerCount = ZERO;
        stat.assetCount = ZERO;
        stat.nftradeVolume = ZERO;
        stat.tofuVolume = ZERO;
        stat.transferCount = ZERO;
    }
    return stat as Stat;
};

export function handleTransfer(event: TransferEvent): void {
    let id = event.params.tokenId.toString();
    let metaWarden = MetaWarden.load(id);
    let stat = getOrCreateStat(event.address);
    if (metaWarden === null) {
        metaWarden = new MetaWarden(id);

        metaWarden.owner = event.params.to.toHexString();
        metaWarden.tokenID = event.params.tokenId;

        stat.assetCount = stat.assetCount.plus(ONE);
    } else {
        metaWarden.owner = event.params.to.toHexString();
    }

    metaWarden.save();

    let prevOwner = Owner.load(event.params.from.toHexString());
    let currentOwner = getOrCreateOwner(event.params.to, stat);

    if (prevOwner !== null) {
        let tmp = prevOwner.assetCount.minus(ONE);
        if (tmp.lt(ZERO)) {
            tmp = ZERO;
        }

        if (tmp.equals(ZERO)) {
            removeOwner(event.params.from, stat);
        } else {
            prevOwner.assetCount = tmp;
            prevOwner.save();
        }
    }

    let transfer = getOrCreateTransfer(event, stat);
    transfer.save();

    currentOwner.assetCount = currentOwner.assetCount.plus(ONE);
    currentOwner.save();
    stat.save();
}
