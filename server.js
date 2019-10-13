import express from "express";
import { ApolloServer } from "apollo-server-express";
import { typeDefs } from "./db/schema";
import { resolvers } from './db/resolvers';
import jwt from 'jsonwebtoken';

import dotenv from 'dotenv';

dotenv.config({path: 'variables.env'});

const app = express();
const port = 5000;

const server = new ApolloServer({
	typeDefs,
	resolvers,
	context: async ({req}) =>{
		const token = req.headers['authorization'];

		if (token !== null || token !== undefined) {
			try{
				//verificando token del cliente 
				const usuarioActual = await jwt.verify(token, process.env.SECRETO)

				// agregando usuario actual al request
				req.usuarioActual = usuarioActual;

				return {
					usuarioActual
				}
			} catch(err){
				console.log(err);
			}
		}
	}
});

server.applyMiddleware({app});

app.listen({ port: port }, ()=>{
	console.log(`El servidor esta corriendo en el puerto http://localhost:${port}${server.graphqlPath}`);
});