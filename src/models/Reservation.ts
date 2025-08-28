import { DataTypes, InferAttributes, InferCreationAttributes, Model, Optional } from 'sequelize';
import { sequelize } from '../shared/db.js';
import { User } from './User.js';
import { Producer } from './Producer.js';

type ReservationStatus = 'reserved' | 'cancelled' | 'confirmed';

interface ReservationAttributes extends InferAttributes<Reservation> {
  id: number;
  consumerId: number; // user id with role consumer
  producerId: number;
  date: string; // YYYY-MM-DD for the slot day
  hour: number; // 0..23
  kwh: number; // requested quantity
  unitPrice: number; // price per kWh locked at reservation time
  status: ReservationStatus;
}

interface ReservationCreation
  extends Optional<ReservationAttributes, 'id' | 'status'> {}

export class Reservation
  extends Model<ReservationAttributes, ReservationCreation>
  implements ReservationAttributes
{
  public id!: number;
  public consumerId!: number;
  public producerId!: number;
  public date!: string;
  public hour!: number;
  public kwh!: number;
  public unitPrice!: number;
  public status!: ReservationStatus;
}

Reservation.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    consumerId: { type: DataTypes.INTEGER, allowNull: false },
    producerId: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.STRING(10), allowNull: false },
    hour: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0, max: 23 } },
    kwh: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(10, 4), allowNull: false },
    status: { type: DataTypes.ENUM('reserved', 'cancelled', 'confirmed'), allowNull: false, defaultValue: 'reserved' },
  },
  { sequelize, tableName: 'reservations', modelName: 'Reservation', timestamps: true, underscored: true }
);

User.hasMany(Reservation, { foreignKey: 'consumerId', as: 'reservations' });
Reservation.belongsTo(User, { foreignKey: 'consumerId', as: 'consumer' });

Producer.hasMany(Reservation, { foreignKey: 'producerId', as: 'reservations' });
Reservation.belongsTo(Producer, { foreignKey: 'producerId', as: 'producer' });



