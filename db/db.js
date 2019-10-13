import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

mongoose.Promise = global.Promise;

mongoose.connect('', {
	useNewUrlParser: true,
	useUnifiedTopology: true
});

mongoose.set('setFindAndModify', false);

const clienteSchema = new mongoose.Schema({
	nombre: String,
	apellido: String,
	empresa: String,
	emails: Array,
	edad: Number,
	tipo: String,
	pedidos: Array,
	vendedor: mongoose.Types.ObjectId
});

const Clientes = mongoose.model('clientes', clienteSchema);

const productoSchema = new mongoose.Schema({
	nombre: String,
	precio: Number,
	stock: Number
});

const Productos = mongoose.model('productos', productoSchema);

const pedidoSchema = new mongoose.Schema({
	pedidos: Array,
	total: Number,
	fecha: Date,
	cliente: mongoose.Types.ObjectId,
	estado: String
});

const Pedidos = mongoose.model('pedidos', pedidoSchema);

const usuarioSchema = mongoose.Schema({
	usuario: String,
	nombre: String,
	rol: String,
	password: String
});

//Hashear los passwords
usuarioSchema.pre('save', function(next) {
	//console.log(this);
	if (!this.isModified('password')) {
		return next();
	}

	bcrypt.genSalt(10, (err, salt)=>{
		if (err) return mext(err);

		bcrypt.hash(this.password, salt, (err, hash)=>{
			if (err) return mext(err);

			this.password = hash;
			next();
		})
	})
})

const Usuarios = mongoose.model('usuarios', usuarioSchema);

export { Clientes, Productos, Pedidos, Usuarios };