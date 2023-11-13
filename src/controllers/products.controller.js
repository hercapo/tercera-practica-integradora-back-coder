import productsModel from "../dao/models/products.schema.js";
import { productRepository } from "../repositories/index.js";
import { faker } from "@faker-js/faker";
import CustomError from "../utils/errors/CustomError.js";
import {
    addProductError,
    productError,
} from "../utils/errors/errorInformation.js";
import EErrors from "../utils/errors/Enum.js";

export const getProducts = async (req, res) => {
    try {
        const { page, query, limit, order } = req.query;
        let sortBy;
        if (order === "desc") {
            sortBy = -1;
        } else if (order === "asc") {
            sortBy = 1;
        }
        let products;
        if (!query) {
            products = await productsModel.paginate(
                {},
                {
                    limit: limit ?? 3,
                    lean: true,
                    page: page ?? 1,
                    sort: { price: sortBy },
                }
            );
        } else {
            products = await productsModel.paginate(
                { category: query },
                {
                    limit: limit ?? 3,
                    lean: true,
                    page: page ?? 1,
                    sort: { price: sortBy },
                }
            );
        }
        res.render("products", {
            products,
            query,
            order,
            user: req.session.user,
        });
    } catch (error) {
        req.logger.error(`Interval server error getting products ${error}`);
        res.status(500).send("Error");
    }
};

export const getProductById = async (req, res) => {
    try {
        const pID = req.params.pid;
        const pFound = await productRepository.getProductById(pID);
        if (!pFound) {
            CustomError.createError({
                name: "Request error",
                cause: productError(pID),
                code: EErrors.ROUTING_ERROR,
                message: "Could not get product with this id",
            });
        }
        res.send(pFound);
    } catch (error) {
        req.logger.error(
            `Interval server error getting products by id ${error}`
        );
        res.status(500).send("Error");
    }
};

export const mockingProducts = async (req, res) => {
    const mockProducts = [];
    const product = {
        title: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: faker.commerce.price(),
        status: faker.datatype.boolean(),
        stock: faker.number.int({ min: 0, max: 50 }),
        category: faker.commerce.productAdjective(),
        thumbnails: [],
        code: faker.string.uuid(),
    };

    for (let i = 0; i < 100; i++) {
        mockProducts.push(product);
    }

    res.send(mockProducts);
};

export const addProduct = async (req, res) => {
    //todo agregar una vista que permita agregar productos a un admin o premium y asi se agregue su email como owner directamente
    const product = req.body;
    const addedProduct = await productRepository.addProduct(product);
    if (!addedProduct) {
        CustomError.createError({
            name: "Request error",
            cause: addProductError(),
            code: EErrors.ROUTING_ERROR,
            message: "Could not add product",
        });
    }
    res.send({ status: "success" });
};

export const updateProduct = async (req, res) => {
    const prodID = req.params.pid;
    const prodToAdd = req.body;
    const user = req.session.user;
    console.log(user, "user", prodToAdd, "prod");
    let prodToUpdate;
    if (user.role === "Admin" || user.email === prodToAdd.owner) {
        prodToUpdate = await productRepository.updateProduct(prodID, prodToAdd);
        console.log(prodToUpdate, "prodtoupdate");
    } else {
        CustomError.createError({
            name: "Request error",
            cause: addProductError(),
            code: EErrors.ROUTING_ERROR,
            message: "Could not update product",
        });
    }
    res.send(prodToUpdate);
};

export const deleteProduct = async (req, res) => {
    try {
        const prodID = req.params.pid;
        // console.log("PRODUCTO ID", prodID);
        const user = req.session.user;
        // console.log("USUARIO", user);
        const prodToDelete = await productRepository.getProductById(prodID);
        // console.log("PRODUCTO TO DELETE", prodToDelete);
        if (user.role === "Admin" || user.email === prodToDelete.owner) {
            await productRepository.deleteProduct(prodID);
        } else {
            CustomError.createError({
                name: "Request error",
                cause: productError(),
                code: EErrors.ROUTING_ERROR,
                message: "Could not delete product",
            });
        }
        res.send(prodToDelete);
    } catch (error) {
        req.logger.error(`Interval server error deleting products ${error}`);
        res.status(500).send("Error getting data.");
    }
};
