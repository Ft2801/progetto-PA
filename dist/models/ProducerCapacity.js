import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../shared/db.js';
import { Producer } from './Producer.js';
export class ProducerCapacity extends Model {
}
ProducerCapacity.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    producerId: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.STRING(10), allowNull: false },
    hour: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0, max: 23 } },
    maxCapacityKwh: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    pricePerKwh: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 0 },
}, { sequelize, tableName: 'producer_capacities', modelName: 'ProducerCapacity', timestamps: true, underscored: true });
Producer.hasMany(ProducerCapacity, { foreignKey: 'producerId', as: 'capacities' });
ProducerCapacity.belongsTo(Producer, { foreignKey: 'producerId', as: 'producer' });
