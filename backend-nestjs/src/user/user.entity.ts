import * as bcrypt from 'bcrypt';
import { Table, Column, Model, DataType, Length } from 'sequelize-typescript';

@Table({ tableName: 'users', paranoid: true, timestamps: true })
export class User extends Model {
	@Length({ min: 1, max: 32 })
	@Column({ 
		unique: true,
		type: DataType.STRING(32)
	})
	username: string;

	@Column
	set password(value: string) {
		this.setDataValue('password', bcrypt.hashSync(value, 10));
	}
}