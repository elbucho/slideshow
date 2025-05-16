import { User } from "./user.entity";
import { Providers } from "src/config";

export const usersProvider = [
	{
		provide: Providers.user,
		useValue: User
	}
];