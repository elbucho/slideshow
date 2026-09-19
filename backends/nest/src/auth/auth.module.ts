import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SessionsModule } from './sessions/sessions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { StateModule } from '@/states/state.module';
import { TokensModule } from '@/tokens/tokens.module';
import { SecurityModule } from "@/auth/security/security.module";

@Module({
    imports: [
        SecurityModule,
        SessionsModule,
        StateModule,
        TokensModule,
        PassportModule
    ],
    controllers: [ AuthController ],
    providers: [ AuthService ],
    exports: [ AuthService ]
})
export class AuthModule {}
