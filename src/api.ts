const endpoint = (chainId: number) => {
	if (chainId === 31) return "https://graphql1.testnet.tropykus.com";
	return "https://graphql1.tropykus.com";
};

const headers = {
	"content-type": "application/json",
};

type FindFirstUsersType = {
	data: {
		findFirstUsers: {
			address: string;
			id: number;
		};
	};
};

type FindManyUser_balancesType = {
	data: {
		findManyUser_balances: {
			market_id: number;
			deposits: string;
			brute_deposits: string;
			borrows: string;
			brute_borrows: string;
			markets: {
				market_type: string;
				contract_address: string;
				name: string;
				id: number;
				is_listed: boolean;
			}[];
		}[];
	};
};

/**
 * Retrieves the user ID for a given user address.
 * @param user_address The user address to search for.
 * @returns A Promise that resolves to the first user matching the provided address, or null if no user is found.
 */
const getUserId = async (
	user_address: string,
	chainId: number
): Promise<FindFirstUsersType | null> => {
	const query = `
	query FindFirstUsers($where: UsersWhereInput) {
		findFirstUsers(where: $where) {
		address
		id
		}
	}`;
	const variables = {
		where: {
			address_lowercase: {
				equals: user_address.toLowerCase(),
			},
		},
	};

	const graphqlQuery = {
		operationName: "FindFirstUsers",
		query,
		variables,
	};

	const options = {
		method: "POST",
		headers,
		body: JSON.stringify(graphqlQuery),
	};

	try {
		const response = await fetch(endpoint(chainId), options);
		return await response.json();
	} catch (error) {
		console.error("Error fetching user balance", error);
		return null;
	}
};

/**
 * Retrieves the balance of a user.
 * @param user_address The address of the user.
 * @returns A promise that resolves to an object containing the user's balance data, or null if the user is not found. The balance data includes the user's deposits, borrows, and interest for each market.
 */
export const getUserBalance = async (
	user_address: string,
	chainId: number
): Promise<FindManyUser_balancesType | null> => {
	const userIdResponse = await getUserId(user_address, chainId);
	if (!userIdResponse) throw new Error("User not found");
	const userId = userIdResponse.data.findFirstUsers.id;

	const query = `
        query getUserBalance($where: User_balancesWhereInput) {
            findManyUser_balances(where: $where) {
                market_id
                deposits
                brute_deposits
                borrows
                brute_borrows
                markets {
                    market_type
                    contract_address
                    name
                    id
                    is_listed
                }
            }
        }
    `;
	const variables = {
		where: {
			user_id: {
				equals: userId,
			},
		},
	};

	const graphqlQuery = {
		operationName: "getUserBalance",
		query,
		variables,
	};

	const options = {
		method: "POST",
		headers,
		body: JSON.stringify(graphqlQuery),
	};

	try {
		const response = await fetch(endpoint(chainId), options);
		const userData = await response.json();
		const marketsBalance = userData.data.findManyUser_balances;
		const marketsBalanceFiltered = marketsBalance.filter(
			(mkt) => mkt.markets.is_listed
		);
		const userBalances = marketsBalanceFiltered.map((mkt) => {
			return {
				market: mkt.markets.name,
				deposits: mkt.deposits,
				borrows: mkt.borrows,
				depositsInterest: mkt.deposits - mkt.brute_deposits,
				borrowInterest: mkt.borrows - mkt.brute_borrows,
			};
		});
		return { data: userBalances };
	} catch (error) {
		console.error("Error fetching user balance", error);
		return null;
	}
};
