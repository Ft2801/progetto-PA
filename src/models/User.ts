import { DataTypes, InferAttributes, InferCreationAttributes, Model, Optional } from 'sequelize';
import { sequelize } from '../shared/db.js';

// Ruoli supportati dall'applicazione
export type UserRole = 'producer' | 'consumer' | 'admin';

// Attributi del modello User mappati sulla tabella users
interface UserAttributes extends InferAttributes<User> {
  id: number;
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  credit: number; // crediti disponibili (per consumer)
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'credit'> {}

// Modello Sequelize per gli utenti
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public passwordHash!: string;
  public role!: UserRole;
  public name!: string;
  public credit!: number;
}

// Definizione campi, validazioni e opzioni di mapping
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



