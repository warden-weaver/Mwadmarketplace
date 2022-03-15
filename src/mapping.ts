import { Transfer } from "../generated/MetaWarden/MetaWarden";
import { MetaWarden, Owner, Stat } from "../generated/schema";
import { Address, BigInt } from "@graphprotocol/graph-ts";
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
        owner.unset(ownerAddress.toHexString());

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
    let owner = getOwner(event.params.to, stat);
    if (metaWarden === null) {
        metaWarden = new MetaWarden(id);

        metaWarden.owner = event.params.to.toHexString();
        metaWarden.tokenID = event.params.tokenId;

        stat.assetCount = stat.assetCount.plus(ONE);
    } else {
        metaWarden.owner = event.params.to.toHexString();
    }

    metaWarden.save();
    owner.save();
    stat.save();

    let prevOwner = Owner.load(event.params.from.toHexString());
    let currentOwner = Owner.load(event.params.to.toHexString());

    if (prevOwner !== null) {
        let prevOwnerAssetCount = prevOwner.assetCount;
        if (prevOwnerAssetCount.gt(ZERO)) {
            prevOwnerAssetCount = prevOwnerAssetCount.minus(ONE);
            prevOwner.assetCount = prevOwnerAssetCount;
        }

        if (prevOwnerAssetCount.le(ZERO)) {
            removeOwner(event.params.from, stat);
        }

        prevOwner.save();
    }

    currentOwner.assetCount = currentOwner.assetCount.plus(ONE);
    currentOwner.save();
}
