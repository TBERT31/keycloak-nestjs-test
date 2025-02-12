import { Body, Controller, Param, Post, Put } from "@nestjs/common";
import { ApiBody } from "@nestjs/swagger";
import { KeycloakService } from "src/keycloak/keycloak.service";
import { NewUser } from "src/keycloak/model/new-user";
import { UpdateUser } from "src/keycloak/model/update-user";

@Controller('user')
export class UserApi{

    constructor(
        private readonly keycloakService: KeycloakService,
    ){}

    @Post()
    @ApiBody({ type: NewUser }) 
    async createNewUser(@Body() newUser: NewUser):Promise<void> {
        await this.keycloakService.createUser(newUser);
    }

    @Put('/:id')
    @ApiBody({ type: UpdateUser }) 
    async updateUser(
        @Param('id') userId: string,
        @Body() updateUser: UpdateUser,
    ):Promise<void> {
        await this.keycloakService.updateUser(updateUser, userId);
    }

    
}