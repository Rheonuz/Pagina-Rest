const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors()); // Permite peticiones desde tu HTML local
app.use(express.json()); // Permite recibir datos en formato JSON

// Configuración de conexión a PostgreSQL
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_BWDb6nFjVw0p@ep-spring-frog-bcr4qeyy-pooler.c-16.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
        rejectUnauthorized: false
    }
});

// Endpoint para obtener todo el menú (Lo usará menu.html)
// Endpoint para obtener todo el menú ensamblando las tablas 3NF
app.get('/api/menu', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.nombre AS categoria,
                p.id_platillo,
                p.nombre,
                p.descripcion,
                MAX(CASE WHEN t.nombre = 'Chico' THEN pr.precio END) AS precio_chico,
                MAX(CASE WHEN t.nombre = 'Mediano' THEN pr.precio END) AS precio_mediano,
                MAX(CASE WHEN t.nombre = 'Grande' THEN pr.precio END) AS precio_grande
            FROM platillos p
            JOIN categorias c ON p.id_categoria = c.id_categoria
            LEFT JOIN precios pr ON p.id_platillo = pr.id_platillo
            LEFT JOIN tamanos t ON pr.id_tamano = t.id_tamano
            GROUP BY c.nombre, p.id_platillo, p.nombre, p.descripcion
            ORDER BY c.nombre, p.id_platillo;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error en el servidor");
    }
});

// Endpoint para actualizar un precio (Lo usará el Dashboard)
app.put('/api/menu/:id_platillo', async (req, res) => {
    const { id_platillo } = req.params;
    const { precio_chico, precio_mediano, precio_grande } = req.body;
    
    try {
        // Actualizar Chico (id_tamano = 1) si existe
        if (precio_chico !== '-' && precio_chico !== null) {
            await pool.query(
                'UPDATE precios SET precio = $1 WHERE id_platillo = $2 AND id_tamano = 1',
                [precio_chico, id_platillo]
            );
        }
        // Actualizar Mediano (id_tamano = 2) si existe
        if (precio_mediano !== '-' && precio_mediano !== null) {
            await pool.query(
                'UPDATE precios SET precio = $1 WHERE id_platillo = $2 AND id_tamano = 2',
                [precio_mediano, id_platillo]
            );
        }
        // Actualizar Grande (id_tamano = 3) si existe
        if (precio_grande !== '-' && precio_grande !== null) {
            await pool.query(
                'UPDATE precios SET precio = $1 WHERE id_platillo = $2 AND id_tamano = 3',
                [precio_grande, id_platillo]
            );
        }
        res.send("Precios actualizados correctamente");
    } catch (err) {
        console.error("Error al actualizar:", err);
        res.status(500).send("Error interno actualizando precios");
    }
});

// Endpoint para validar el inicio de sesión
app.post('/api/login', async (req, res) => {
    const { usuario, password } = req.body;
    
    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE usuario = $1 AND password = $2',
            [usuario, password]
        );
        
        // Si PostgreSQL devuelve al menos 1 fila, las credenciales son correctas
        if (result.rows.length > 0) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: "Credenciales incorrectas" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Error interno validando usuario");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);

});