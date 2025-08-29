import { DataTypes, InferAttributes, InferCreationAttributes, Model, Optional } from 'sequelize';
import { sequelize } from '../shared/db.js';
import { User } from './User.js';

// Tipologie di energia supportate
export type EnergyType = 'Fossile' | 'Eolico' | 'Fotovoltaico';

// Attributi del modello Producer (impianto del produttore)
interface ProducerAttributes extends InferAttributes<Producer> {
  id: number;
  userId: number; // utente proprietario
  energyType: EnergyType;
  co2PerKwh: number; // grammi di CO2 per kWh
  pricePerKwh: number; // prezzo base se non ridefinito dallo slot
  defaultMaxPerHourKwh: number; // limite massimo orario
}

interface ProducerCreationAttributes
  extends Optional<ProducerAttributes, 'id' | 'pricePerKwh'> {}

// Modello Sequelize per i produttori
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

// Definizione campi e opzioni del modello Producer
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

// Associazioni: un utente ha un profilo produttore
User.hasOne(Producer, { foreignKey: 'userId', as: 'producer' });
Producer.belongsTo(User, { foreignKey: 'userId', as: 'user' });


