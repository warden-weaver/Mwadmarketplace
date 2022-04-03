import {
    TakerBid,
    TakerAsk,
    CancelAllOrders,
    CancelMultipleOrders,
} from "../generated/WardenMarketplace/WardenMarketplace";
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { Order, UsedNonce, Stat, MinNonce } from "../generated/schema";
import { ZERO, ONE } from "./constant";

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

export const handleBid = (event: TakerBid): void => {
    let orderId = event.params.orderHash.toHexString();

    let order = Order.load(orderId);
    if (order === null) {
        order = new Order(orderId);
        order.txHash = event.transaction.hash;
        order.isOrderAsk = true;
        order.hash = event.params.orderHash;
        order.taker = event.params.taker;
        order.maker = event.params.maker;
        order.collection = event.params.collection;
        order.price = event.params.price;
        order.tokenId = event.params.tokenId;
        order.amount = event.params.amount;
        order.strategy = event.params.strategy;
        order.currency = event.params.currency;
        order.nonce = event.params.orderNonce;
    }

    let usedNonceId =
        event.params.maker.toHexString() +
        "-" +
        event.params.orderNonce.toString();

    let usedNonce = UsedNonce.load(usedNonceId);
    if (usedNonce === null) {
        usedNonce.user = event.params.maker;
        usedNonce.nonce = event.params.orderNonce;
    }

    let stat = getOrCreateStat(event.params.collection);
    stat.wardenExchangeVolume = stat.wardenExchangeVolume.plus(
        event.params.price
    );

    order.save();
    usedNonce.save();
    stat.save();
};

export const handleAsk = (event: TakerAsk): void => {
    let orderId = event.params.orderHash.toHexString();

    let order = Order.load(orderId);
    if (order === null) {
        order = new Order(orderId);
        order.txHash = event.transaction.hash;
        order.isOrderAsk = false;
        order.hash = event.params.orderHash;
        order.taker = event.params.taker;
        order.maker = event.params.maker;
        order.collection = event.params.collection;
        order.price = event.params.price;
        order.tokenId = event.params.tokenId;
        order.amount = event.params.amount;
        order.strategy = event.params.strategy;
        order.currency = event.params.currency;
        order.nonce = event.params.orderNonce;
    }

    let usedNonceId =
        event.params.maker.toHexString() +
        "-" +
        event.params.orderNonce.toString();

    let usedNonce = UsedNonce.load(usedNonceId);
    if (usedNonce === null) {
        usedNonce.user = event.params.maker;
        usedNonce.nonce = event.params.orderNonce;
    }

    let stat = getOrCreateStat(event.params.collection);
    stat.wardenExchangeVolume = stat.wardenExchangeVolume.plus(
        event.params.price
    );

    order.save();
    usedNonce.save();
    stat.save();
};

export const handleCancelAllOrders = (event: CancelAllOrders): void => {
    let userMinNonce = MinNonce.load(event.params.user.toHexString());
    userMinNonce.user = event.params.user;
    userMinNonce.minNonce = event.params.newMinNonce;

    userMinNonce.save();
};

export const handleCancelMultipleOrders = (
    event: CancelMultipleOrders
): void => {
    let nonces = event.params.orderNonces;
    for (let i = 0; i < nonces.length; i++) {
        let nonce = nonces[i];
        let id = event.params.user.toHexString() + "-" + nonce.toString();
        let usedNonce = UsedNonce.load(id);
        usedNonce.user = event.params.user;
        usedNonce.nonce = nonce;

        usedNonce.save();
    }
};
