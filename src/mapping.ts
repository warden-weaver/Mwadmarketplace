import { Transfer } from "../generated/MetaWarden/MetaWarden";
import { MetaWarden, Owner, Stat } from "../generated/schema";
import { Address, BigInt } from "@graphprotocol/graph-ts";

export const getOwner = (ownerAddress: Address, stat: Stat): Owner => {
    let owner = Owner.load(ownerAddress.toHexString());
    if (owner === null) {
        owner = new Owner(ownerAddress.toHexString());
        stat.ownerCount = stat.ownerCount.plus(BigInt.fromI32(1));
    }
    return owner as Owner;
};

export const removeOwner = (ownerAddress: Address, stat: Stat): void => {
    let owner = Owner.load(ownerAddress.toHexString());
    if (owner !== null) {
        owner.unset(ownerAddress.toHexString());

        let tmp = stat.ownerCount.minus(BigInt.fromI32(1));
        if (tmp.lt(BigInt.fromI32(0))) {
            tmp = BigInt.fromI32(0);
        }
        stat.ownerCount = tmp;
    }
};

export const getStat = (mwadAddress: Address): Stat => {
    let stat = Stat.load(mwadAddress.toHexString());
    if (stat === null) {
        stat = new Stat(mwadAddress.toHexString());
        stat.ownerCount = BigInt.fromI32(0);
    }
    return stat as Stat;
};

export function handleTransfer(event: Transfer): void {
    let id = event.params.tokenId.toString();
    let metaWarden = MetaWarden.load(id);
    let stat = getStat(event.address);
    removeOwner(event.params.from, stat);
    let owner = getOwner(event.params.to, stat);
    if (metaWarden === null) {
        metaWarden = new MetaWarden(id);

        metaWarden.owner = event.params.to.toHexString();
        metaWarden.tokenID = event.params.tokenId;
    } else {
        metaWarden.owner = event.params.to.toHexString();
    }

    metaWarden.save();
    owner.save();
    stat.save();
}
