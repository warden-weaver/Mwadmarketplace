import { Transfer as TransferEvent } from "../generated/MetaWarden/MetaWarden";
import { MetaWarden, Owner, Stat, Transfer } from "../generated/schema";
import {
    Address,
    BigInt,
    log,
    store,
    Bytes,
    ByteArray,
} from "@graphprotocol/graph-ts";
import {
    ZERO,
    ONE,
    NFTRADE_MARKET_ADDRESS,
    TOFU_MARKET_ADDRESS,
    NFTRADE,
    TOFU,
} from "./constant";

const chunks = (x: string): string[] => {
    let res: string[] = [];
    let tmp = x.slice(2);
    while (tmp.length > 0) {
        res.push("0x" + tmp.slice(0, 64));
        tmp = tmp.slice(64);
    }
    return res;
};

const extractAmount = (input: Bytes, dexName: String): BigInt => {
    let funcName = input.toHexString().slice(2, 10);
    let splitedInput: string[] = chunks(input.toHexString().slice(8));
    if (dexName === TOFU) {
        // log.debug("¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶¶ {} {} {} {} {} \n", [
        //     TOFU,
        //     "funcName:" + funcName,
        //     BigInt.fromI32(splitedInput.length).toString(),
        //     funcName === "9b44d556" ? "True" : "False",
        //     splitedInput.length >= 8 ? "True" : "False",
        // ]);
        if (funcName === "ba847759" && splitedInput.length >= 8) {
            // log.debug("£££££££££££££££££  \n {} \n {} \n {}", [
            //     "index 2: " + splitedInput[2],
            //     "index 5: " + splitedInput[5],
            //     "index 7: " + splitedInput[7],
            // ]);
            return BigInt.fromUnsignedBytes(
                ByteArray.fromHexString(splitedInput[7]) as Bytes
            );
        }
    } else if (dexName === NFTRADE) {
        // log.debug("§§§§§§§§§§§§§§§§§§§ {} {} {} {} {} \n", [
        //     NFTRADE,
        //     "funcName:" + funcName,
        //     BigInt.fromI32(splitedInput.length).toString(),
        //     funcName === "9b44d556" ? "True" : "False",
        //     splitedInput.length >= 8 ? "True" : "False",
        // ]);
        if (funcName === "9b44d556" && splitedInput.length >= 8) {
            // log.debug("¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢¢  \n {} \n {} \n {}", [
            //     "index 2: " + splitedInput[2],
            //     "index 5: " + splitedInput[5],
            //     "index 7: " + splitedInput[7],
            // ]);
            return BigInt.fromUnsignedBytes(
                ByteArray.fromHexString(splitedInput[7]) as Bytes
            );
        }
    }
    return ZERO;
};

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
        transfer.dexName = "";
        transfer.soldAmount = ZERO;

        if (
            event.transaction.to.equals(
                Address.fromString(NFTRADE_MARKET_ADDRESS)
            )
        ) {
            transfer.dexName = NFTRADE;
            let tradeVol = extractAmount(event.transaction.input, NFTRADE);
            transfer.soldAmount = tradeVol;
            stat.nftradeVolume = stat.nftradeVolume.plus(tradeVol);
        } else if (
            event.transaction.to.equals(Address.fromString(TOFU_MARKET_ADDRESS))
        ) {
            transfer.dexName = TOFU;
            let tradeVol = extractAmount(event.transaction.input, TOFU);
            transfer.soldAmount = tradeVol;
            stat.tofuVolume = stat.tofuVolume.plus(tradeVol);
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
        stat.wardenExchangeVolume = ZERO;
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
