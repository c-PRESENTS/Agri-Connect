import type { Express, Request, Response } from "express";
import { ZodError, z } from "zod";
import {
  createSavedAddressSchema,
  updateSavedAddressSchema,
} from "@shared/schema";
import { isAuthenticated } from "../../auth";
import { AddressEncryptionConfigurationError } from "../../account/address-crypto";
import { userAddressRepository } from "../../repositories/user-address-repository";

interface AccountRouteDeps {
  getUserId(req: Request): string | undefined;
}

function addressError(error: unknown, res: Response): Response {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: "Please check the address details and try again" });
  }
  if (error instanceof AddressEncryptionConfigurationError) {
    return res.status(503).json({ error: "Saved addresses are temporarily unavailable" });
  }
  return res.status(500).json({ error: "Saved-address request failed" });
}

export function registerAccountRoutes(app: Express, deps: AccountRouteDeps): void {
  app.get("/api/account/addresses", isAuthenticated, async (req, res) => {
    try {
      return res.json(await userAddressRepository.list(deps.getUserId(req)!));
    } catch (error) {
      return addressError(error, res);
    }
  });

  app.post("/api/account/addresses", isAuthenticated, async (req, res) => {
    try {
      const input = createSavedAddressSchema.parse(req.body);
      const address = await userAddressRepository.create(deps.getUserId(req)!, input);
      return res.status(201).json(address);
    } catch (error) {
      return addressError(error, res);
    }
  });

  app.patch("/api/account/addresses/:addressId", isAuthenticated, async (req, res) => {
    try {
      const addressId = z.string().uuid().parse(req.params.addressId);
      const input = updateSavedAddressSchema.parse(req.body);
      const address = await userAddressRepository.update(deps.getUserId(req)!, addressId, input);
      return address
        ? res.json(address)
        : res.status(404).json({ error: "Saved address not found" });
    } catch (error) {
      return addressError(error, res);
    }
  });

  app.put("/api/account/addresses/:addressId/default", isAuthenticated, async (req, res) => {
    try {
      const addressId = z.string().uuid().parse(req.params.addressId);
      const address = await userAddressRepository.setDefault(deps.getUserId(req)!, addressId);
      return address
        ? res.json(address)
        : res.status(404).json({ error: "Saved address not found" });
    } catch (error) {
      return addressError(error, res);
    }
  });

  app.delete("/api/account/addresses/:addressId", isAuthenticated, async (req, res) => {
    try {
      const addressId = z.string().uuid().parse(req.params.addressId);
      const deleted = await userAddressRepository.delete(deps.getUserId(req)!, addressId);
      return deleted
        ? res.status(204).end()
        : res.status(404).json({ error: "Saved address not found" });
    } catch (error) {
      return addressError(error, res);
    }
  });
}

