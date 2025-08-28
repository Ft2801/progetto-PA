import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../shared/db.js';
export class User extends Model {
}
User.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('producer', 'consumer', 'admin'), allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    credit: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
}, {
    sequelize,
    tableName: 'users',
    modelName: 'User',
    timestamps: true,
    underscored: true,
});
