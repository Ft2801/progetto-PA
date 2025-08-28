import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../shared/db.js';
import { User } from './User.js';
export class Producer extends Model {
}
Producer.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    energyType: {
        type: DataTypes.ENUM('Fossile', 'Eolico', 'Fotovoltaico'),
        allowNull: false,
    },
    co2PerKwh: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    pricePerKwh: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 0 },
    defaultMaxPerHourKwh: { type: DataTypes.DECIMAL(10, 3), allowNull: false, defaultValue: 0 },
}, { sequelize, tableName: 'producers', modelName: 'Producer', timestamps: true, underscored: true });
User.hasOne(Producer, { foreignKey: 'userId', as: 'producer' });
Producer.belongsTo(User, { foreignKey: 'userId', as: 'user' });
