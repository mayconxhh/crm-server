import mongoose from 'mongoose';
import { Clientes, Productos, Pedidos, Usuarios } from './db';
import bcrypt from 'bcrypt';

import dotenv from 'dotenv';

dotenv.config({path: 'variables.env'});

import jwt from 'jsonwebtoken';

const ObjectId = mongoose.Types.ObjectId;

const crearToken = (user, secreto, expire)=>{
  const {usuario} = user;

  return jwt.sign({usuario}, secreto, {expiresIn: expire});
}

class Cliente{
  constructor(id, { nombre, apellido, empresa, emails, edad, tipo, pedidos }){
    this.id = id;
    this.nombre = nombre;
    this.apellido = apellido;
    this.empresa = empresa;
    this.emails = emails;
    this.edad = edad;
    this.tipo = tipo;
    this.pedidos = pedidos;
  }
}

export const resolvers = {
  Query: {
    getCliente : (root, { id }) =>{
      return new Promise((resolve, reject)=>{

        Clientes.findById({ _id: id }, (error, cliente)=>{
          if (error) reject(error);
          else resolve(cliente);
        });
      });
    },
    getClientes : (root, { limite, offset, vendedor })=> {

      let filtro;
      if (vendedor) filtro = {vendedor : vendedor}

      return Clientes.find(filtro).limit(limite).skip(offset);
    },
    totalClientes: (root, { vendedor }) => {

      let filtro;
      if (vendedor) filtro = {vendedor : vendedor}

      return new Promise((resolve, reject)=>{
        Clientes.countDocuments(filtro, (error, count)=>{
          if (error) reject(error);
          else resolve(count);
        })
      });
    },
    getProductos: (root, { limite, offset })=>{
      return Productos.find({}).limit(limite).skip(offset);
    },
    getProducto:(root, { id })=>{
      return new Promise((resolve, reject)=>{

        Productos.findById({ _id: id }, (error, producto)=>{
          if (error) reject(error);
          else resolve(producto);
        });
      });
    },
    totalProductos: (root) => {
      return new Promise((resolve, reject)=>{
        Productos.countDocuments({}, (error, count)=>{
          if (error) reject(error);
          else resolve(count);
        })
      });
    },
    getPedidos: (root, { cliente, limite, offset })=>{
      return new Promise((resolve, reject)=>{

        Pedidos.find({ cliente: cliente }, (error, pedidos)=>{
          if (error) reject(error);
          else resolve(pedidos);
        });
      });
    },
    topClientes: (root) =>{
      return new Promise((resolve, reject)=>{

        Pedidos.aggregate([
          {
            $match: { estado: "COMPLETADO" }
          },
          {
            $group: {
              _id: "$cliente",
              total: { $sum: "$total" }
            }
          },
          {
            $lookup: {
              from: "clientes",
              localField: "_id",
              foreignField: "_id",
              as: "cliente"
            }
          },
          {
            $sort: { total: -1 }
          },
          {
            $limit: 10
          }
        ], (error, result)=>{
          if (error) reject(error);
          else resolve(result);
        });
      });
    },
    getUsuario : (root, args, { usuarioActual })=>{
      if (!usuarioActual) return null;

      // obtener usuairo actual del request del jwt verificado
      const usuario = Usuarios.findOne({usuario: usuarioActual.usuario});

      return usuario;
    }
  },
  Mutation: {
    crearCliente : (root, {input}) =>{

      const nuevoCliente = new Clientes({
        nombre: input.nombre,
        apellido: input.apellido,
        empresa: input.empresa,
        emails: input.emails,
        edad: input.edad,
        tipo: input.tipo,
        pedidos: input.pedidos,
        vendedor: input.vendedor
      });

      nuevoCliente.id = nuevoCliente._id;

      return new Promise((resolve, reject)=>{
        nuevoCliente.save(error =>{
          if (error) reject(error);
          else resolve(nuevoCliente);
        })
      });
    },
    actualizarCliente : (root, { input }) =>{

      return new Promise((resolve, reject)=>{

        Clientes.findOneAndUpdate({ _id: input.id }, input, { new: true }, (error, cliente)=>{
          if (error) reject(error);
          else resolve(cliente);
        });
      });
    },
    eliminarCliente: (root, { id }) =>{
      return new Promise((resolve, reject)=>{

        Clientes.findOneAndDelete({ _id: id }, (error)=>{
          if (error) reject(error);
          else resolve("Cliente Eliminado!");
        });
      });
    },
    nuevoProducto: (root, { input })=>{
      const nuevoProducto = new Productos({
        nombre: input.nombre,
        precio: input.precio,
        stock: input.stock
      });

      nuevoProducto.id = nuevoProducto._id;

      return new Promise((resolve, reject)=>{
        nuevoProducto.save((error)=>{
          if (error) reject(error);
          else resolve(nuevoProducto);
        })
      })
    },
    actualizarProducto: (root, { input })=>{
      return new Promise((resolve, reject)=>{

        Productos.findOneAndUpdate({ _id: input.id }, input, { new: true }, (error, producto)=>{
          if (error) reject(error);
          else resolve(producto);
        });
      });
    },
    eliminarProducto: (root, { id })=>{
      return new Promise((resolve, reject)=>{

        Productos.findOneAndDelete({ _id: id }, (error)=>{
          if (error) reject(error);
          else resolve("Producto Eliminado!");
        });
      });
    },
    nuevoPedido: (root, { input }) =>{
      const nuevoPedido = new Pedidos({
        pedidos: input.pedidos,
        total: input.total,
        fecha: new Date(),
        cliente: input.cliente,
        estado: "PENDIENTE"
      });

      nuevoPedido.id = nuevoPedido._id;

      return new Promise((resolve, reject)=>{

        nuevoPedido.save((error)=>{
          if (error) reject(error);
          else resolve(nuevoPedido);
        })
      })
    },
    actualizarPedido: (root, { input })=>{
      return new Promise((resolve, reject)=>{

        const { estado, anteriorEstado } = input;

        // console.log(anteriorEstado)
        // console.log(estado)
        let instruccion;

        if (estado==="COMPLETADO") {
          instruccion = '-';
        } else {
          if ( anteriorEstado === "COMPLETADO" ) {
            instruccion = "+"
          } else {
            instruccion = null;
          }
        }

        // actualizar y recorrer cantidad de pedidos en base al estado del pedido
        input.pedidos.forEach(pedido =>{
          console.log(pedido.id)
          Productos.update(
            { "_id": pedido.id},
            {
              "$inc": {
                "stock": (instruccion !== null ) ? `${instruccion}${pedido.cantidad }` : 0
              }
            }, function(error){
              if (error) return new Error(error);
            }
          )
        });

        Pedidos.findOneAndUpdate({ _id: input.id }, input, { new: true }, (error, pedido)=>{
          if (error) reject(error);
          else resolve(pedido);
        });
      });

    },
    nuevoUsuario: async(root, { input })=>{

      const existeUsuario = await Usuarios.findOne({ usuario: input.usuario });

      if (existeUsuario) {
        throw new Error("El nombre de usuario ya existe");
      }

      const nuevoUsuario = await new Usuarios(input).save();

      return "Usuario creado correctamente!";
    },
    autenticarUsuario : async (root, { input })=>{

      const { usuario, password } = input;

      const nombreUsuario = await Usuarios.findOne({usuario});

      if (!nombreUsuario) throw new Error('Usuario no encontrado');

      const passwordCorrecto = await bcrypt.compare( password, nombreUsuario.password );

      if (!passwordCorrecto) {
        throw new Error('Password Incorrecto');
      }

      return {
        token: crearToken(nombreUsuario, process.env.SECRETO, 60 * 60)
      }
    }
  }
};