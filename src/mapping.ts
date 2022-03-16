import { Transfer } from "../generated/MetaWarden/MetaWarden";
import { MetaWarden, Owner, Stat } from "../generated/schema";
import { Address, BigInt, log, store } from "@graphprotocol/graph-ts";
import { ZERO, ONE } from "./constant";

export const getOwner = (ownerAddress: Address, stat: Stat): Owner => {
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
        store.remove('Owner', ownerAddress.toHexString());

        let tmp = stat.ownerCount.minus(ONE);
        if (tmp.lt(ZERO)) {
            tmp = ZERO;
        }
        stat.ownerCount = tmp;
    }
};

export const getStat = (mwadAddress: Address): Stat => {
    let stat = Stat.load(mwadAddress.toHexString());
    if (stat === null) {
        stat = new Stat(mwadAddress.toHexString());
        stat.ownerCount = ZERO;
        stat.assetCount = ZERO;
    }
    return stat as Stat;
};

export function handleTransfer(event: Transfer): void {
    let id = event.params.tokenId.toString();
    let metaWarden = MetaWarden.load(id);
    let stat = getStat(event.address);
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
    let currentOwner = getOwner(event.params.to, stat);

    if (prevOwner !== null) {
        let tmp = prevOwner.assetCount.minus(ONE);
        if (tmp.lt(ZERO)) {
            tmp = ZERO
        }

        if (tmp.equals(ZERO)) {
            removeOwner(event.params.from, stat);
        } else {
            prevOwner.assetCount = tmp;
            prevOwner.save();
        }
    }

    currentOwner.assetCount = currentOwner.assetCount.plus(ONE);
    currentOwner.save();
    stat.save();
}
