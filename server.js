const express = require("express");

const app = express();

app.use(express.json());

const posts = [
  {
    id: 1,
    title: "Soporte para auriculares",
    author: "German"
  },
  {
    id: 2,
    title: "Figura de dragón",
    author: "Juan"
  }
];

app.get("/", (req, res) => {
  res.send("3D-SHARE API funcionando");
});

app.get("/posts", (req, res) => {
  res.json(posts);
});

app.listen(3000, () => {
  console.log("Servidor corriendo en puerto 3000");
});