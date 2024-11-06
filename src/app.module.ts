import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ApiKeyStrategy } from "./auth/apikey.strategy";
import { AuthModule } from "./auth/auth.module";
import { AuthService } from "./auth/auth.service";
import configuration from "./config/configuration";
import { WEBMatchResultVerifierController } from "./controller/web/web-match-result-verifier.controller";
import { WEBMatchResultVerifierService } from "./service/web/web-match-result-verifier.service";
import { APP_GUARD } from "@nestjs/core";
import { IpWhitelistGuard } from "./guards/ip-whitelist.guard";

@Module({
    imports: [
        ConfigModule.forRoot({
            load: [configuration],
            isGlobal: true,
        }),
        AuthModule,
    ],
    controllers: [WEBMatchResultVerifierController],
    providers: [
        ApiKeyStrategy,
        AuthService,
        WEBMatchResultVerifierService,
        {
            provide: APP_GUARD,
            useClass: IpWhitelistGuard,
        },
    ],
})
export class AppModule {}
