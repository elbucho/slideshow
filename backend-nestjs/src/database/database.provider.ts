import { Sequelize } from "sequelize-typescript";
import { Providers } from "../config";
import { ConfigService } from "@nestjs/config";
import { User } from "src/user/user.entity";

export const databaseProviders = [
  {
    inject: [ConfigService],
    provide: Providers.database,
    useFactory: async (configService: ConfigService) => {
      const sequelize = new Sequelize({
        dialect: "mariadb",
        host: configService.get<string>("DB_HOST"),
        port: configService.get<number>("DB_PORT") || 3306,
        username: configService.get<string>("DB_USER"),
        password: configService.get<string>("DB_PASS"),
        database: configService.get<string>("DB_NAME"),
      });

      sequelize.addModels([User]);
      await sequelize.sync();
      return sequelize;
    },
  },
];
