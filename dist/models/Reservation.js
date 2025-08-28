import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../shared/db.js';
import { User } from './User.js';
import { Producer } from './Producer.js';
export class Reservation extends Model {
}
Reservation.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    consumerId: { type: DataTypes.INTEGER, allowNull: false },
    producerId: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.STRING(10), allowNull: false },
    hour: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0, max: 23 } },
    kwh: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(10, 4), allowNull: false },
    status: { type: DataTypes.ENUM('reserved', 'cancelled', 'confirmed'), allowNull: false, defaultValue: 'reserved' },
}, { sequelize, tableName: 'reservations', modelName: 'Reservation', timestamps: true, underscored: true });
User.hasMany(Reservation, { foreignKey: 'consumerId', as: 'reservations' });
Reservation.belongsTo(User, { foreignKey: 'consumerId', as: 'consumer' });
Producer.hasMany(Reservation, { foreignKey: 'producerId', as: 'reservations' });
Reservation.belongsTo(Producer, { foreignKey: 'producerId', as: 'producer' });
