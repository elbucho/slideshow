import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SequelizeModuleOptions, SequelizeOptionsFactory } from "@nestjs/sequelize";

@Injectable()
export class DatabaseConfigService implements SequelizeOptionsFactory {
	constructor(private readonly configService: ConfigService) {}

	createSequelizeOptions(
		connectionName?: string
	): SequelizeModuleOptions {
		return {
			dialect: "mariadb",
			host: this.configService.getOrThrow('DB_HOST'),
			port: +this.configService.getOrThrow('DB_PORT'),
			database: this.configService.getOrThrow('DB_NAME'),
			username: this.configService.getOrThrow('DB_USER'),
			password: this.configService.getOrThrow('DB_PASS'),
			autoLoadModels: true,
			synchronize: true
		};
	}
}