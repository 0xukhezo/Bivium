import "reflect-metadata";
import { applicationModule } from "@bivium/application";
import {
	portsModule,
	repositoryModule,
	serviceModule,
} from "@bivium/infrastructure";
import { Container } from "inversify";
import { configBindings } from "./container/config/configBinding.js";

const container = new Container();

container.load(
	configBindings,
	repositoryModule,
	serviceModule,
	portsModule,
	applicationModule,
);

export { container };
