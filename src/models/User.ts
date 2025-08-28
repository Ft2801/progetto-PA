import { DataTypes, InferAttributes, InferCreationAttributes, Model, Optional } from 'sequelize';
import { sequelize } from '../shared/db.js';

export type UserRole = 'producer' | 'consumer' | 'admin';

interface UserAttributes extends InferAttributes<User> {
  id: number;
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  credit: number; // tokens available (for consumers)
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'credit'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public passwordHash!: string;
  public role!: UserRole;
  public name!: string;
  public credit!: number;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('producer', 'consumer', 'admin'), allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    credit: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
  },
  {
    sequelize,
    tableName: 'users',
    modelName: 'User',
    timestamps: true,
    underscored: true,
  }
);



