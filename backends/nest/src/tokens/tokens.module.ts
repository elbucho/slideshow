import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StateModule } from '@/states/state.module';
import { SessionsModule } from '@/auth/sessions/sessions.module';
import { TokensService } from './tokens.service';

@Module({
    imports: [
        JwtModule.register({}),
        StateModule,
        SessionsModule
    ],
    providers: [
        TokensService
    ],
    exports: [
        TokensService
    ]
})
export class TokensModule {}