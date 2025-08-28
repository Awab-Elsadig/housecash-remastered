import { useMemo } from "react";

export function useDashboardData(userId, items, members) {
	return useMemo(() => {
		if (!userId) return empty();
		if (!items?.length) return empty();

		const paymentsByMember = {};
		const directional = {};
		const memberMap = new Map(members.map((m) => [m._id?.toString(), m]));

		for (const it of items) {
			const author = it.author?.toString();
			if (!author || !it.price || !it.members?.length) continue;
			const share = it.price / it.members.length;

			for (const mem of it.members) {
				const pid = mem.userID?.toString();
				if (!pid || pid === author || mem.paid) continue;
				addDebt(directional, pid, author, share);
			}

			if (author !== userId) {
				const me = it.members.find((m) => m.userID?.toString() === userId);
				if (me && !me.paid) {
					if (!paymentsByMember[author])
						paymentsByMember[author] = { memberInfo: memberMap.get(author) || {}, items: [], total: 0 };
					paymentsByMember[author].items.push({ _id: it._id, name: it.name, share, price: it.price });
					paymentsByMember[author].total += share;
				}
			}
		}

		// Netting
		const nettable = deepClone(directional);
		for (const a in nettable) {
			for (const b in nettable[a]) {
				if (nettable[b]?.[a]) {
					if (nettable[a][b] === nettable[b][a]) {
						delete nettable[a][b];
						delete nettable[b][a];
					} else if (nettable[a][b] > nettable[b][a]) {
						nettable[a][b] -= nettable[b][a];
						delete nettable[b][a];
					} else {
						nettable[b][a] -= nettable[a][b];
						delete nettable[a][b];
					}
				}
			}
		}

		const netPerMember = {};
		let totalOwed = 0,
			totalOwing = 0;
		for (const debtor in nettable) {
			for (const creditor in nettable[debtor]) {
				const amount = nettable[debtor][creditor];
				if (amount <= 0) continue;
				if (creditor === userId && debtor !== userId) {
					netPerMember[debtor] = (netPerMember[debtor] || 0) + amount;
					totalOwed += amount;
				} else if (debtor === userId && creditor !== userId) {
					netPerMember[creditor] = (netPerMember[creditor] || 0) - amount;
					totalOwing += amount;
				}
			}
		}

		const bilateral = {};
		for (const m of members) {
			const id = m._id?.toString();
			if (!id || id === userId) continue;
			const theyOwe = directional[id]?.[userId] || 0;
			const youOwe = directional[userId]?.[id] || 0;
			const total = Math.abs(theyOwe - youOwe);
			if (theyOwe > 0 || youOwe > 0) bilateral[id] = { theyOwe, youOwe, total };
		}

		return {
			paymentsByMember,
			netPerMember,
			bilateral,
			totals: { owing: totalOwing, owed: totalOwed, net: totalOwed - totalOwing },
		};
	}, [userId, items, members]);
}

export function buildDetailItems(userId, otherId, items) {
	if (!userId || !otherId) return [];
	const list = [];
	for (const it of items) {
		const author = it.author?.toString();
		if (!author) continue;
		const share = it.price / (it.members.length || 1);

		// Case 1: The other person owes the current user (theyOwe)
		// The current user is the author, and the other person is an unpaid member.
		if (author === userId) {
			const theirMembership = it.members.find((m) => m.userID?.toString() === otherId);
			if (theirMembership && !theirMembership.paid) {
				list.push({ id: it._id, name: it.name, share, direction: "theyOwe" });
			}
		}
		// Case 2: The current user owes the other person (youOwe)
		// The other person is the author, and the current user is an unpaid member.
		else if (author === otherId) {
			const myMembership = it.members.find((m) => m.userID?.toString() === userId);
			if (myMembership && !myMembership.paid) {
				list.push({ id: it._id, name: it.name, share, direction: "youOwe" });
			}
		}
	}
	return list;
}

export function bilateralItemIds(userId, otherId, items) {
	if (!userId || !otherId) return [];
	const ids = [];
	for (const it of items) {
		const author = it.author?.toString();
		if (!author) continue;

		// An item is part of the bilateral relationship if one user is the author
		// and the other is an unpaid participant.
		if (author === userId) {
			const otherMember = it.members.find((m) => m.userID?.toString() === otherId);
			if (otherMember && !otherMember.paid) {
				ids.push(it._id);
			}
		} else if (author === otherId) {
			const userMember = it.members.find((m) => m.userID?.toString() === userId);
			if (userMember && !userMember.paid) {
				ids.push(it._id);
			}
		}
	}
	return ids;
}

function addDebt(store, d, c, amt) {
	if (!store[d]) store[d] = {};
	store[d][c] = (store[d][c] || 0) + amt;
}
function deepClone(o) {
	return JSON.parse(JSON.stringify(o));
}
function empty() {
	return { paymentsByMember: {}, netPerMember: {}, bilateral: {}, totals: { owing: 0, owed: 0, net: 0 } };
}
