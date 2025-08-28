import { DataTypes, InferAttributes, InferCreationAttributes, Model, Optional } from 'sequelize';
import { sequelize } from '../shared/db.js';
import { User } from './User.js';

export type EnergyType = 'Fossile' | 'Eolico' | 'Fotovoltaico';

interface ProducerAttributes extends InferAttributes<Producer> {
  id: number;
  userId: number; // owner user
  energyType: EnergyType;
  co2PerKwh: number; // g CO2 per kWh
  pricePerKwh: number; // base price unless overridden by slot pricing later
  defaultMaxPerHourKwh: number; // upper bound per-hour capacity across slots
}

interface ProducerCreationAttributes
  extends Optional<ProducerAttributes, 'id' | 'pricePerKwh'> {}

export class Producer
  extends Model<ProducerAttributes, ProducerCreationAttributes>
  implements ProducerAttributes
{
  public id!: number;
  public userId!: number;
  public energyType!: EnergyType;
  public co2PerKwh!: number;
  public pricePerKwh!: number;
  public defaultMaxPerHourKwh!: number;
}

Producer.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    energyType: {
      type: DataTypes.ENUM('Fossile', 'Eolico', 'Fotovoltaico'),
      allowNull: false,
    },
    co2PerKwh: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    pricePerKwh: { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 0 },
    defaultMaxPerHourKwh: { type: DataTypes.DECIMAL(10, 3), allowNull: false, defaultValue: 0 },
  },
  { sequelize, tableName: 'producers', modelName: 'Producer', timestamps: true, underscored: true }
);

User.hasOne(Producer, { foreignKey: 'userId', as: 'producer' });
Producer.belongsTo(User, { foreignKey: 'userId', as: 'user' });


