import { NextFunction, Request, Response } from 'express';
import { authService } from '../services/authService.ts';
import { sendSuccess } from '../utils/response.ts';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.validated?.body as { name: string; email: string; password: string };
      const result = await authService.register(body);
      return sendSuccess(res, result, 201);
    } catch (err) {
      return next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.validated?.body as { email: string; password: string };
      const result = await authService.login(body);
      return sendSuccess(res, result, 200);
    } catch (err) {
      return next(err);
    }
  },

  async googleConfig(_req: Request, res: Response) {
    return sendSuccess(res, { clientId: authService.getGoogleClientId() }, 200);
  },

  async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.validated?.body as { idToken: string };
      const result = await authService.loginWithGoogle(body.idToken);
      return sendSuccess(res, result, 200);
    } catch (err) {
      return next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.validated?.body as { refreshToken: string };
      const result = await authService.refresh(body.refreshToken);
      return sendSuccess(res, result, 200);
    } catch (err) {
      return next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as { refreshToken?: string } | undefined;
      await authService.logout(body?.refreshToken);
      return sendSuccess(res, { loggedOut: true }, 200);
    } catch (err) {
      return next(err);
    }
  },

  async me(req: Request, res: Response) {
    return sendSuccess(res, { user: req.authUser }, 200);
  },

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.validated?.body as { name: string };
      const updated = await authService.updateProfile(req.authUser!.id, body.name);
      return sendSuccess(res, { user: updated }, 200);
    } catch (err) {
      return next(err);
    }
  },

  async bootstrapStatus(_req: Request, res: Response, next: NextFunction) {
    try {
      const status = await authService.getBootstrapStatus();
      return sendSuccess(res, status, 200);
    } catch (err) {
      return next(err);
    }
  },

  async bootstrapAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.validated?.body as {
        name: string;
        email: string;
        password: string;
        passcode: string;
      };
      const result = await authService.bootstrapAdmin(body);
      return sendSuccess(res, result, 201);
    } catch (err) {
      return next(err);
    }
  },
};
