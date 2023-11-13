// import CartManagerDB from "../dao/mongo/carts.manager.js";
// const cartManager = new CartManagerDB();
// import ProductDTO from '../dto/products.dto.js';
import { cartRepository, productRepository } from "../repositories/index.js";
import CustomError from "../utils/errors/CustomError.js";
import { createCartError } from "../utils/errors/errorInformation.js";
import EErrors from '../utils/errors/Enum.js';

export const getCarts = async (req, res) => {
    const carts = await cartRepository.getAllCarts();
    res.send(carts);
};

export const createNewCart = async (req, res) => {
    try {
        const cart = await cartRepository.createNewCart();
        if (!cart) {
            CustomError.createError({
                name: "Request error",
                cause: createCartError(),
                code: EErrors.ROUTING_ERROR,
                message: "Error creating cart.",
            });
        }
        res.send(cart);
    } catch (error) {
        req.logger.error(`Interval server error creating cart ${error}`)
        res.status(500).send("Error al obtener los datos");
    }
};

export const getCartByID = async (req, res) => {
    try {
        const cartID = req.params.cid;
        const cart = await cartRepository.getById(cartID);
        if(!cart) {
            CustomError.createError({
                name: "Request error",
                cause: createCartError(cartID),
                code: EErrors.ROUTING_ERROR,
                message: "Error creating cart.",
            })
        }
        const products = cart.products;
        // res.send({products});
        res.render("cart", { products });
    } catch (error) {
        req.logger.error(`Interval server error getting cart by id ${error}`)
        res.status(500).send("Can´t get cart data.");
    }
};

export const addProductToCart = async (req, res) => {
    //TODO: Hacer que se agreguen los productos y se cree el carrito si no existe
    try {
        const cartID = req.params.cid;
        const prodID = req.params.pid;
        const user = req.session.user;
        const cart = await cartRepository.getById(cartID);
        console.log(cart);
        if (cart) {
            const existingProd = cart.products.find(
                (product) => product.product._id.toString() === prodID
            );
            if (existingProd) {
                const quantity = existingProd.quantity + 1;
                await cartRepository.updateQuantity(cartID, prodID, quantity);
                return;
            }
        } else {
            CustomError.createError({
                name: "Request error",
                cause: createCartError(cartID, prodID),
                code: EErrors.ROUTING_ERROR,
                message: "Error creating cart.",
            })
        }
        const productToAdd = await productRepository.getProductById(prodID)
        if(user.role === "Premium" && user.email === productToAdd.owner){ 
            CustomError.createError({
                name: "Request error",
                cause: createCartError(cartID, prodID),
                code: EErrors.ROUTING_ERROR,
                message: "You can not add an item that its yours to your cart.",
            })
        }
        const productAddedToCart = await cartRepository.addToCart(
            cartID,
            prodID
        );
        res.send(productAddedToCart);
    } catch (error) {
        req.logger.error(`Interval server error adding product to cart${error}`)
        res.status(500).send("Error, unable to obtain data");
    }
};

export const deleteProdFromCart = async (req, res) => {
    const cartID = req.params.cid;
    const prodID = req.params.pid;
    const deleted = await cartRepository.deleteProduct(cartID, prodID);
    res.send(deleted);
};

export const updateWholeCart = async (req, res) => {
    const cartID = req.params.cid;
    const prod = req.body;
    // console.log(cartID, prod);
    const updatedCart = await cartRepository.updateWholeCart(cartID, prod);
    // console.log("a ver", updatedCart);
    res.send(updatedCart);
};

export const updateQuantity = async (req, res) => {
    const cid = req.params.cid;
    const pid = req.params.pid;
    const quantity = req.body.quantity;
    const updatedQuantity = await cartRepository.updateQuantity(
        cid,
        pid,
        quantity
    );
    res.send(updatedQuantity);
};

export const deleteCart = async (req, res) => {
    const cid = req.params.cid;
    const deletedCart = await cartRepository.emptyCart(cid);
    if(!deletedCart) {
        CustomError.createError({
            name: "Request error",
            cause: createCartError(cid),
            code: EErrors.ROUTING_ERROR,
            message: "Error creating cart.",
        })
    }
    console.log(deletedCart);
    res.send(deletedCart);
};

export const finishPurchase = async (req, res) => {
    try {
        console.log("reqsessionuser", req?.session?.user);
        const user = req?.session?.user;
        const cartID = req.params.cid;
        const cart = await cartRepository.purchase(cartID, user.email);
        cart.ticket.purchaser = `Name: ${user.first_name} Last Name: ${user.last_name}. Email: ${user.email}`;
        if (cart) {
            const newTicket = { newTicket: cart.ticket };
            console.log(newTicket);
            res.render("purchase", { newTicket: newTicket });
        } else {
            res.status(500).send("error: error trying to purchase.");
        }
    } catch (error) {
        req.logger.error(`Interval server error finishing purchase ${error}`)
        res.status(500).send("Error purchasing.");
    }
};
