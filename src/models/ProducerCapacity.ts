import { DataTypes, InferAttributes, InferCreationAttributes, Model, Optional } from 'sequelize';
import { sequelize } from '../shared/db.js';
import { Producer } from './Producer.js';

interface ProducerCapacityAttributes extends InferAttributes<ProducerCapacity> {
  id: number;
  producerId: number;
  date: string; // YYYY-MM-DD (for next-day slots)
  hour: number; // 0..23
  maxCapacityKwh: number; // maximum producible for this hour
  pricePerKwh: number; // price for this hour
}

interface ProducerCapacityCreation
  extends Optional<ProducerCapacityAttributes, 'id' | 'pricePerKwh'> {}

export class ProducerCapacity
  extends Model<ProducerCapacityAttributes, ProducerCapacityCreation>
  implements ProducerCapacityAttributes
{
  public id!: number;
  public producerId!: number;
  public date!: string;
  public hour!: number;
  public maxCapacityKwh!: number;
  public pricePerKwh!: number;
}

ProducerCapacity.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    producerId: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.STRING(10), allowNull: false },
    hour: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0, max: 23 } },
    maxCapacityKwh: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    pricePerKwh: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 0 },
  },
  { sequelize, tableName: 'producer_capacities', modelName: 'ProducerCapacity', timestamps: true, underscored: true }
);

Producer.hasMany(ProducerCapacity, { foreignKey: 'producerId', as: 'capacities' });
ProducerCapacity.belongsTo(Producer, { foreignKey: 'producerId', as: 'producer' });



