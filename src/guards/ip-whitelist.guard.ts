import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Observable } from "rxjs";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";
import { IConfig } from "../config/configuration";
import logger from "../logger";

@Injectable()
export class IpWhitelistGuard implements CanActivate {
    constructor(private configService: ConfigService<IConfig>) {}

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const clientIp = request.ip || request.socket.remoteAddress;
        if (!clientIp) return false;

        const whitelistedIps = this.configService.get<string[]>("ip_whitelist") || [];
        const allowed = ["127.0.0.1", "::1", "::ffff:127.0.0.1", ...whitelistedIps].includes(clientIp);
        logger.info(`Request from IP: ${clientIp} - Allowed: ${allowed}`);
        return allowed;
    }
}
